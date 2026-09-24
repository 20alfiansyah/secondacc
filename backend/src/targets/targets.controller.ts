import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { TargetsService } from './targets.service';
import { UpsertTargetDto } from './dto/targets.dto';

@Controller('targets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class TargetsController {
  constructor(private readonly targetsService: TargetsService) {}

  /** GET /api/targets?month=&year= — target omset bulanan (default bulan berjalan). */
  @Get()
  async find(@Query() query: { month?: string; year?: string }) {
    const data = await this.targetsService.find(query);
    return { success: true, data };
  }
  /** GET /api/targets/recent?months=3 — target + realisasi N bulan terakhir (widget dashboard). */
  @Get('recent')
  async recent(@Query('months') months?: string) {
    const parsed = months === undefined || months === '' ? 3 : Number(months);
    const data = await this.targetsService.recent(parsed);
    return { success: true, data };
  }

  /** PUT /api/targets — simpan/upsert target omset bulanan. */
  @Put()
  async upsert(@Body() dto: UpsertTargetDto) {
    const data = await this.targetsService.upsert(dto);
    return { success: true, data };
  }
}
