import { Controller, Get } from '@nestjs/common';
import { TablesService } from './tables.service';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  async getTables() {
    const data = await this.tablesService.getTables();
    return { success: true, data };
  }
}
