import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsIn } from 'class-validator';
export class CreateUserDto { @IsString() @IsNotEmpty() name:string; @IsEmail() email:string; @IsString() @MinLength(8) password:string; @IsOptional() @IsIn(['ADMIN','EMPLOYEE','CLIENT']) role?:'ADMIN'|'EMPLOYEE'|'CLIENT'; }
