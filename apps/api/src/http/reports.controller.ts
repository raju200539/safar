import { Body, Controller, Get, Post } from '@nestjs/common';
import { error } from './error';

@Controller('v1')
export class ReportsController {
  @Get('alerts')
  alerts(): unknown {
    return error('NOT_IMPLEMENTED', 'Alerts land in M5.');
  }

  @Post('reports')
  create(@Body() _body: unknown): unknown {
    return error('NOT_IMPLEMENTED', 'Reports land in M5.');
  }
}
