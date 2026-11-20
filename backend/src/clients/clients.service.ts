
import {
  Injectable,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.client.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        requests: true,
      },
      orderBy: {
        user: {
          createdAt: 'desc',
        },
      },
    });
  }

  async create(dto: CreateClientDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: dto.name.trim(),
            email,
            password: hashedPassword,
            role: 'CLIENT',
          },
        });

        return tx.client.create({
          data: {
            userId: user.id,
            companyName: dto.companyName?.trim() || null,
            phone: dto.phone?.trim() || null,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
              },
            },
          },
        });
      });
    } catch (error) {
      if ((error as any)?.code === 'P2002') {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }
}
