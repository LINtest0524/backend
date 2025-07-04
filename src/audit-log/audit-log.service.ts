import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';

interface AuditLogRecordParams {
  user: User | { id: number };
  action: string;
  ip: string;
  platform: string;
  target?: string;
  before?: any;
  after?: any;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly logRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async record(params: AuditLogRecordParams) {
    const {
      user,
      action,
      ip,
      platform,
      target,
      before,
      after,
    } = params;

    const userId = 'id' in user ? user.id : (user as any).id;

    if (!userId) {
      console.warn('⚠️ 無法寫入操作紀錄，user id 缺失');
      return;
    }

    const log = this.logRepo.create({
      user: { id: userId }, // ✅ 關鍵：避免 TypeORM 誤認為要 update user entity
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
