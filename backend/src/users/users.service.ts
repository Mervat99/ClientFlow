import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
@Injectable()
export class UsersService {
 constructor(private prisma: PrismaService){}
 getAllUsers(){return this.prisma.user.findMany({select:{id:true,name:true,email:true,role:true,isActive:true,createdAt:true}});}
 async createUser(dto: CreateUserDto){if(await this.prisma.user.findUnique({where:{email:dto.email}})) throw new ConflictException('Email already exists'); const hashed=await bcrypt.hash(dto.password,10); return this.prisma.user.create({data:{name:dto.name,email:dto.email,password:hashed,role:dto.role},select:{id:true,name:true,email:true,role:true,isActive:true,createdAt:true}});}
}
