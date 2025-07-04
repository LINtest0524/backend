import {
  Controller,
  Get,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';

import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async findAll(@Request() req) {
    const user = req.user;

    console.log('👤 取得登入使用者：', user);

    // ✅ SUPER_ADMIN 可看所有紀錄
    if (user.role === 'SUPER_ADMIN') {
      return this.auditLogService.findAll();
    }

    // ✅ 其他角色需有 companyId，否則禁止存取
    if (!user.companyId) {
      throw new UnauthorizedException('無公司代碼，無法取得紀錄');
    }

    return this.auditLogService.findByCompany(user.companyId);
  }
}
