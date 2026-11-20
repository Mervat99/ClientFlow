import {IsNotEmpty,IsUUID} from 'class-validator'; export class AssignRequestDto{@IsUUID()@IsNotEmpty()employeeId:string;}
