import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
@Controller('users')
export class UsersController { constructor(private service: UsersService) {} @Get() findAll(){return this.service.getAllUsers();} @Post() create(@Body() dto: CreateUserDto){return this.service.createUser(dto);} }
