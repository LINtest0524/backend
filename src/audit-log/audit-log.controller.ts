import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditLogService } from './audit-log.service';

@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_LEVEL_5', 'AGENT_LEVEL_6', 'AGENT_LEVEL_7', 'AGENT_LEVEL_8', 'AGENT_LEVEL_9', 'AGENT_LEVEL_10', 'AGENT_LEVEL_11', 'AGENT_LEVEL_12', 'AGENT_SUPPORT')
  @Get()
  async getLogs(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('user') user?: string,
    @Query('ip') ip?: string,
    @Query('target') target?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    const currentUser = req.user as any;

    return this.auditLogService.findFiltered({
      currentUser,
      from,
      to,
      search,
      user,
      ip,
      target,
      page,
      limit,
    });
  }

  // 分潤管理操作記錄專用端點
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_LEVEL_5', 'AGENT_LEVEL_6', 'AGENT_LEVEL_7', 'AGENT_LEVEL_8', 'AGENT_LEVEL_9', 'AGENT_LEVEL_10', 'AGENT_LEVEL_11', 'AGENT_LEVEL_12', 'AGENT_SUPPORT')
  @Get('commission-conditions')
  async getCommissionConditionLogs(
    @Req() req: Request,
    @Query('targetId') targetId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('action') action?: string,
    @Query('operator') operator?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    const currentUser = req.user as any;

    return this.auditLogService.findCommissionConditionLogs({
      currentUser,
      targetId,
      startDate,
      endDate,
      action,
      operator,
      page,
      limit,
    });
  }
}
