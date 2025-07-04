import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditLogService } from './audit-log.service';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';

@Controller('audit-log')
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getLogs(@Req() req: Request) {
    const user = req.user as any;

    let where: any = {};

    // 👤 AGENT 只能看自己公司紀錄
    if (
      user.role === 'AGENT_OWNER' ||
      user.role === 'AGENT_SUPPORT'
    ) {
      where = {
        user: { company: { id: user.companyId } },
      };
    }

    // SUPER_ADMIN / GLOBAL_ADMIN 可看全部
    return this.auditRepo.find({
      where,
      order: { created_at: 'DESC' },
      relations: ['user'],
    });
  }
}
