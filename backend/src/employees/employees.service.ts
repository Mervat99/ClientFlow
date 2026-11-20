
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.employee.findMany({
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
        department: true,
        assignments: true,
      },
      orderBy: {
        user: {
          createdAt: 'desc',
        },
      },
    });
  }

  async create(dto: CreateEmployeeDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });

      if (!department) {
        throw new NotFoundException('Department not found');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: dto.name.trim(),
            email,
            password: hashedPassword,
            role: 'EMPLOYEE',
          },
        });

        return tx.employee.create({
          data: {
            userId: user.id,
            ...(dto.departmentId
              ? { departmentId: dto.departmentId }
              : {}),
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
            department: true,
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
