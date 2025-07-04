import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly logRepo: Repository<AuditLog>,
  ) {}

  async record(params: {
    user: User;
    action: string;
    ip: string;
    platform: string;
    target?: string;
    before?: any;
    after?: any;
  }) {
    const { user, action, ip, platform, target, before, after } = params;

    const log = this.logRepo.create({
      user,
      action,
      ip,
      platform,
      target,
      before,
      after,
    });

    return this.logRepo.save(log);
  }
}
