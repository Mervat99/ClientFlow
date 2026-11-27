
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';

import { RequestsService } from './requests.service';

import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { AssignRequestDto } from './dto/assign-request.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(
    private readonly service: RequestsService,
  ) {}

  // Get requests
  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
    UserRole.CLIENT,
  )
  all(@Req() req: AuthenticatedRequest) {
    return this.service.getAllRequests(req.user);
  }

  // Create request
  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.CLIENT,
  )
  create(
    @Body() dto: CreateRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.createRequest(dto, req.user);
  }

  // Update request status
  @Patch(':id/status')
  @Roles(
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
  )
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRequestStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.updateRequestStatus(
      id,
      dto,
      req.user,
    );
  }

  // Assign request to employee
  @Post(':id/assign')
  @Roles(UserRole.ADMIN)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.assignRequest(
      id,
      dto,
      req.user,
    );
  }
}
