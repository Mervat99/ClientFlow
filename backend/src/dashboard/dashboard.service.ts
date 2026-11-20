import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const [
      clients,
      employees,
      services,
      totalRequests,
      newRequests,
      inProgressRequests,
      waitingRequests,
      completedRequests,
      cancelledRequests,
    ] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.employee.count(),
      this.prisma.service.count({ where: { isActive: true } }),
      this.prisma.request.count(),
      this.prisma.request.count({ where: { status: 'NEW' } }),
      this.prisma.request.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.request.count({ where: { status: 'WAITING_FOR_CLIENT' } }),
      this.prisma.request.count({ where: { status: 'COMPLETED' } }),
      this.prisma.request.count({ where: { status: 'CANCELLED' } }),
    ]);

    return {
      totals: {
        clients,
        employees,
        activeServices: services,
        requests: totalRequests,
      },
      requestsByStatus: {
        NEW: newRequests,
        IN_PROGRESS: inProgressRequests,
        WAITING_FOR_CLIENT: waitingRequests,
        COMPLETED: completedRequests,
        CANCELLED: cancelledRequests,
      },
    };
  }
}