
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, createReadStream } from 'fs';
import { randomUUID } from 'crypto';

import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  Roles,
  UserRole,
} from '../auth/decorators/roles.decorator';

const uploadDirectory = join(
  process.cwd(),
  'uploads',
  'documents',
);

if (!existsSync(uploadDirectory)) {
  mkdirSync(uploadDirectory, { recursive: true });
}

const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

const allowedExtensions = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
];

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CLIENT)
  findAll(@Req() req: any) {
    return this.documentsService.findAll(req.user);
  }

  @Post('upload')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CLIENT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDirectory,
        filename: (req, file, callback) => {
          const extension = extname(file.originalname).toLowerCase();
          callback(null, `${randomUUID()}${extension}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (req, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();

        if (
          !allowedExtensions.includes(extension) ||
          !allowedMimeTypes.includes(file.mimetype)
        ) {
          return callback(
            new BadRequestException('File type is not allowed'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('requestId') requestId: string,
    @Req() req: any,
  ) {
    return this.documentsService.upload(file, requestId, req.user);
  }

  @Get(':id/download')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CLIENT)
  async download(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const document = await this.documentsService.findOne(
      id,
      req.user,
    );

    if (!existsSync(document.filePath)) {
      throw new BadRequestException('File is missing from storage');
    }

    const stream = createReadStream(document.filePath);

    return new StreamableFile(stream, {
      type: document.mimeType,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(
        document.originalName,
      )}`,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.CLIENT)
  remove(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.documentsService.remove(id, req.user);
  }
}
