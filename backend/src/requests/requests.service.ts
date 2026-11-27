
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../auth/decorators/roles.decorator';

import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { AssignRequestDto } from './dto/assign-request.dto';

interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // Get requests according to the logged-in user's role
  async getAllRequests(user: AuthUser) {
    let where = {};

    if (user.role === UserRole.EMPLOYEE) {
      where = {
        assignments: {
          some: {
            employee: {
              userId: user.userId,
            },
          },
        },
      };
    } else if (user.role === UserRole.CLIENT) {
      where = {
        client: {
          userId: user.userId,
        },
      };
    } else if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.request.findMany({
      where,
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        service: true,
        assignments: {
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        statusHistory: {
          orderBy: {
            changedAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Create request
  async createRequest(dto: CreateRequestDto, user: AuthUser) {
    let client;

    if (user.role === UserRole.CLIENT) {
      // Clients can create requests only for themselves
      client = await this.prisma.client.findUnique({
        where: {
          userId: user.userId,
        },
        include: {
          user: {
            select: {
              id: true,
              isActive: true,
            },
          },
        },
      });

      if (!client) {
        throw new NotFoundException('Client profile not found');
      }

      if (!client.user.isActive) {
        throw new ForbiddenException('Account is inactive');
      }
    } else if (user.role === UserRole.ADMIN) {
      if (!dto.clientId) {
        throw new BadRequestException('Client ID is required');
      }

      client = await this.prisma.client.findUnique({
        where: {
          id: dto.clientId,
        },
        include: {
          user: {
            select: {
              id: true,
              isActive: true,
            },
          },
        },
      });

      if (!client) {
        throw new NotFoundException('Client not found');
      }

      if (!client.user.isActive) {
        throw new BadRequestException('Client account is inactive');
      }
    } else {
      throw new ForbiddenException('You cannot create requests');
    }

    const service = await this.prisma.service.findUnique({
      where: {
        id: dto.serviceId,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (!service.isActive) {
      throw new BadRequestException('Service is inactive');
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const newRequest = await tx.request.create({
        data: {
          clientId: client.id,
          serviceId: dto.serviceId,
          title: dto.title,
          description: dto.description,
        },
        include: {
          client: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          service: true,
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId: newRequest.id,
          newStatus: 'NEW',
          reason: 'Request created',
        },
      });

      return newRequest;
    });

    // Notify client and active administrators
    const admins = await this.prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    await Promise.allSettled([
      this.notifications.create({
        userId: request.client.userId,
        title: 'Request created',
        message: `Your request for ${request.service.name} was created successfully.`,
        type: 'SUCCESS',
        link: '/requests',
      }),

      ...admins.map((admin) =>
        this.notifications.create({
          userId: admin.id,
          title: 'New client request',
          message: `A new request for ${request.service.name} has been created.`,
          type: 'INFO',
          link: '/requests',
        }),
      ),
    ]);

    return request;
  }

  // Validate allowed status transitions
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ) {
    const allowedTransitions: Record<string, string[]> = {
      NEW: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: [
        'WAITING_FOR_CLIENT',
        'COMPLETED',
        'CANCELLED',
      ],
      WAITING_FOR_CLIENT: ['IN_PROGRESS', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = allowedTransitions[currentStatus] ?? [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot change request status from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  // Update request status safely
  async updateRequestStatus(
    id: string,
    dto: UpdateRequestStatusDto,
    user: AuthUser,
  ) {
    const request = await this.prisma.request.findUnique({
      where: {
        id,
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Employees can update only requests assigned to them
    if (user.role === UserRole.EMPLOYEE) {
      const assignment = await this.prisma.requestAssignment.findFirst({
        where: {
          requestId: id,
          employee: {
            userId: user.userId,
          },
        },
      });

      if (!assignment) {
        throw new ForbiddenException(
          'You can only update requests assigned to you',
        );
      }
    } else if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    if (request.status === dto.status) {
      throw new BadRequestException('Request already has this status');
    }

    this.validateStatusTransition(request.status, dto.status);

    // Update status and history in one transaction.
    // The status condition prevents simultaneous updates from overwriting each other.
    const updated = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.request.updateMany({
        where: {
          id,
          status: request.status,
        },
        data: {
          status: dto.status,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'This request was updated by someone else. Please refresh and try again.',
        );
      }

      await tx.requestStatusHistory.create({
        data: {
          requestId: id,
          oldStatus: request.status,
          newStatus: dto.status,
          reason: dto.reason,
        },
      });

      const updatedRequest = await tx.request.findUnique({
        where: {
          id,
        },
        include: {
          client: {
            select: {
              id: true,
              userId: true,
            },
          },
          service: true,
          assignments: {
            include: {
              employee: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      if (!updatedRequest) {
        throw new NotFoundException('Request not found');
      }

      return updatedRequest;
    });

    // Get active administrators
    const admins = await this.prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    // Collect notification recipients without duplicates
    const recipients = new Set<string>([
      updated.client.userId,
      ...updated.assignments.map(
        (assignment) => assignment.employee.userId,
      ),
      ...admins.map((admin) => admin.id),
    ]);

    const results = await Promise.allSettled(
      Array.from(recipients).map((userId) =>
        this.notifications.create({
          userId,
          title: 'Request status updated',
          message: `The status of your request for ${updated.service.name} changed from ${request.status} to ${dto.status}.`,
          type: 'INFO',
          link: '/requests',
        }),
      ),
    );

    results.forEach((result) => {
      if (result.status === 'rejected') {
        console.error(
          'Failed to create request status notification:',
          result.reason,
        );
      }
    });

    return updated;
  }

  // Assign request to employee
  async assignRequest(
    id: string,
    dto: AssignRequestDto,
    user: AuthUser,
  ) {
    // Check role inside the service as well
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can assign requests',
      );
    }

    const request = await this.prisma.request.findUnique({
      where: {
        id,
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Prevent assigning employees to completed or cancelled requests
    if (
      request.status === 'COMPLETED' ||
      request.status === 'CANCELLED'
    ) {
      throw new BadRequestException(
        'Cannot assign an employee to a completed or cancelled request',
      );
    }

    const employee = await this.prisma.employee.findUnique({
      where: {
        id: dto.employeeId,
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (
      employee.user.role !== UserRole.EMPLOYEE ||
      !employee.user.isActive
    ) {
      throw new BadRequestException(
        'Employee account is inactive or invalid',
      );
    }

    const existingAssignment =
      await this.prisma.requestAssignment.findUnique({
        where: {
          requestId_employeeId: {
            requestId: id,
            employeeId: dto.employeeId,
          },
        },
      });

    if (existingAssignment) {
      throw new ConflictException('Employee already assigned');
    }

    const assignment = await this.prisma.requestAssignment.create({
      data: {
        requestId: id,
        employeeId: dto.employeeId,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        request: {
          include: {
            client: true,
            service: true,
          },
        },
      },
    });

    await Promise.allSettled([
      this.notifications.create({
        userId: assignment.employee.user.id,
        title: 'New task assigned',
        message: `You have been assigned to a request for ${assignment.request.service.name}.`,
        type: 'INFO',
        link: '/requests',
      }),

      this.notifications.create({
        userId: assignment.request.client.userId,
        title: 'Employee assigned',
        message: `An employee has been assigned to your request for ${assignment.request.service.name}.`,
        type: 'INFO',
        link: '/requests',
      }),
    ]);

    return assignment;
  }
}
