import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { User } from '../user/user.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // ✅ 新增這個
  ) {}

  async logLogin(user: User, ip: string, platform: string) {
    // ✅ 1. 寫入 audit_log 紀錄表
    const log = this.auditRepo.create({
      user,
      ip,
      platform,
    });
    await this.auditRepo.save(log);

    // ✅ 2. 同步更新 user 表的登入資訊（會讓你用戶列表顯示）
    user.last_login_ip = ip;
    user.last_login_platform = platform;
    user.last_login_at = new Date();

    await this.userRepository.save(user);
  }

  async findAll(): Promise<AuditLog[]> {
    return this.auditRepo.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }
}
