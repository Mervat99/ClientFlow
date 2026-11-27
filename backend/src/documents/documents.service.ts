
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { UserRole } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { unlink } from 'fs/promises';

interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // Return only documents the current user is allowed to see.
  async findAll(user: AuthUser) {
    const where: Prisma.DocumentWhereInput = {};

    if (user.role === UserRole.CLIENT) {
      where.client = {
        userId: user.userId,
      };
    } else if (user.role === UserRole.EMPLOYEE) {
      where.request = {
        assignments: {
          some: {
            employee: {
              userId: user.userId,
            },
          },
        },
      };
    } else if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You cannot access documents');
    }

    return this.prisma.document.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        requestId: true,
        clientId: true,
        uploadedById: true,
        originalName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        request: {
          select: {
            id: true,
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // Check whether a user can access a specific request.
  private async assertCanAccessRequest(
    requestId: string,
    user: AuthUser,
  ): Promise<void> {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.CLIENT) {
      const request = await this.prisma.request.findFirst({
        where: {
          id: requestId,
          client: {
            userId: user.userId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!request) {
        throw new ForbiddenException(
          'You can only access documents belonging to your own requests',
        );
      }

      return;
    }

    if (user.role === UserRole.EMPLOYEE) {
      const assignment = await this.prisma.requestAssignment.findFirst({
        where: {
          requestId,
          employee: {
            userId: user.userId,
          },
        },
        select: {
          requestId: true,
        },
      });

      if (!assignment) {
        throw new ForbiddenException(
          'You can only access documents for requests assigned to you',
        );
      }

      return;
    }

    throw new ForbiddenException('You cannot access this request');
  }

  async upload(
    file: Express.Multer.File,
    requestId: string,
    user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('Please select a file');
    }

    if (!requestId) {
      await this.removePhysicalFile(file.path);
      throw new BadRequestException('Request ID is required');
    }

    try {
      const request = await this.prisma.request.findUnique({
        where: {
          id: requestId,
        },
        include: {
          client: {
            select: {
              id: true,
              userId: true,
            },
          },
          service: true,
        },
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      await this.assertCanAccessRequest(requestId, user);

      const document = await this.prisma.document.create({
        data: {
          requestId: request.id,
          clientId: request.client.id,
          uploadedById: user.userId,
          originalName: file.originalname,
          storedName: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          filePath: file.path,
        },
        select: {
          id: true,
          requestId: true,
          clientId: true,
          uploadedById: true,
          originalName: true,
          mimeType: true,
          size: true,
          createdAt: true,
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Notify relevant users after successful upload.
      try {
        if (user.role === UserRole.CLIENT) {
          const admins = await this.prisma.user.findMany({
            where: {
              role: UserRole.ADMIN,
            },
            select: {
              id: true,
            },
          });

          await Promise.allSettled(
            admins.map((admin) =>
              this.notifications.create({
                userId: admin.id,
                title: 'New document uploaded',
                message: `A client uploaded ${file.originalname} to a request for ${request.service.name}.`,
                type: 'INFO',
                link: '/documents',
              }),
            ),
          );
        } else {
          await this.notifications.create({
            userId: request.client.userId,
            title: 'New document uploaded',
            message: `A new document was uploaded to your request for ${request.service.name}.`,
            type: 'INFO',
            link: '/documents',
          });
        }
      } catch (notificationError) {
        console.error(
          'Document notification failed:',
          notificationError,
        );
      }

      return document;
    } catch (error) {
      const documentExists = await this.prisma.document.findFirst({
        where: {
          storedName: file.filename,
        },
        select: {
          id: true,
        },
      });

      if (!documentExists) {
        await this.removePhysicalFile(file.path);
      }

      throw error;
    }
  }

  // Used internally by the download endpoint.
  async findOne(id: string, user: AuthUser) {
    const document = await this.prisma.document.findUnique({
      where: {
        id,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.assertCanAccessRequest(document.requestId, user);

    return document;
  }

  async remove(id: string, user: AuthUser) {
    const document = await this.findOne(id, user);

    if (
      user.role !== UserRole.ADMIN &&
      document.uploadedById !== user.userId
    ) {
      throw new ForbiddenException(
        'Only the administrator or uploader can delete this document',
      );
    }

    await this.prisma.document.delete({
      where: {
        id,
      },
    });

    try {
      await this.removePhysicalFile(document.filePath);
    } catch (error) {
      console.error('Failed to delete physical document:', error);
    }

    return {
      message: 'Document deleted successfully',
    };
  }

  private async removePhysicalFile(filePath: string) {
    try {
      await unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
