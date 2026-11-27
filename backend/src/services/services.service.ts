
import {
  Injectable,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UserRole } from '../auth/decorators/roles.decorator';

interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  all(user: AuthUser) {
    return this.prisma.service.findMany({
      where:
        user.role === UserRole.CLIENT
          ? { isActive: true }
          : {},
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(dto: CreateServiceDto) {
    const existingService = await this.prisma.service.findUnique({
      where: {
        name: dto.name,
      },
    });

    if (existingService) {
      throw new ConflictException('Service already exists');
    }

    return this.prisma.service.create({
      data: dto,
    });
  }
}
