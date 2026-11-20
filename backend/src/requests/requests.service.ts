
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../auth/decorators/roles.decorator';

import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { AssignRequestDto } from './dto/assign-request.dto';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // Get all requests
  getAllRequests() {
    return this.prisma.request.findMany({
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
  async createRequest(dto: CreateRequestDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (!service.isActive) {
      throw new BadRequestException('Service is inactive');
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const newRequest = await tx.request.create({
        data: dto,
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

    // Notify client and administrators
    const admins = await this.prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
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

  // Update request status
  async updateRequestStatus(
    id: string,
    dto: UpdateRequestStatusDto,
  ) {
    const request = await this.prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status === dto.status) {
      throw new BadRequestException(
        'Request already has this status',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.request.update({
        where: { id },
        data: {
          status: dto.status,
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

      await tx.requestStatusHistory.create({
        data: {
          requestId: id,
          oldStatus: request.status,
          newStatus: dto.status,
          reason: dto.reason,
        },
      });

      return updatedRequest;
    });

    // Get all administrators
    const admins = await this.prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
      },
      select: {
        id: true,
      },
    });

    // Collect recipients without duplicates
    const recipients = new Set<string>([
      updated.client.userId,
      ...updated.assignments.map(
        (assignment) => assignment.employee.userId,
      ),
      ...admins.map((admin) => admin.id),
    ]);

    // Create notifications
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

    // Log notification errors
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
  async assignRequest(id: string, dto: AssignRequestDto) {
    const request = await this.prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
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

    // Notify employee and client
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
