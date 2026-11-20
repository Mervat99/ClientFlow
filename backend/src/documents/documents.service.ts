
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../auth/decorators/roles.decorator';
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

  async findAll(user: AuthUser) {
    const where =
      user.role === UserRole.CLIENT
        ? { client: { userId: user.userId } }
        : {};

    return this.prisma.document.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
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

    let request;

    try {
      request = await this.prisma.request.findUnique({
        where: { id: requestId },
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

      if (
        user.role === UserRole.CLIENT &&
        request.client.userId !== user.userId
      ) {
        throw new ForbiddenException(
          'You can only upload files to your own requests',
        );
      }

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
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Send notifications without affecting the document upload.
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
      // Remove the uploaded file only if the document was not saved.
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

  async findOne(id: string, user: AuthUser) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (
      user.role === UserRole.CLIENT &&
      document.client.userId !== user.userId
    ) {
      throw new ForbiddenException(
        'You cannot access this document',
      );
    }

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
      where: { id },
    });

    await this.removePhysicalFile(document.filePath);

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
