import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { DashboardService } from './dashboard.service';

/**
 * Endpoint analitik dashboard — semuanya khusus ADMIN (guard class-level).
 * Handler tipis: terima query string mentah, delegasi ke service murni agregasi.
 */
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** GET /api/dashboard/overview — pie gender, bar omset 7 hari, best seller, progres target. */
  @Get('overview')
  async overview(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('tzOffset') tzOffset?: string,
  ) {
    const data = await this.dashboardService.getOverview({ month, year, tzOffset });
    return { success: true, data };
  }
}
