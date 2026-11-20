
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { EmployeesModule } from './employees/employees.module';
import { ServicesModule } from './services/services.module';
import { ClientsModule } from './clients/clients.module';
import { RequestsModule } from './requests/requests.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    DepartmentsModule,
    EmployeesModule,
    ServicesModule,
    ClientsModule,
    RequestsModule,
    AuthModule,
    DashboardModule,
    DocumentsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
