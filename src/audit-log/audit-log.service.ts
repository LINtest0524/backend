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
    private readonly userRepository: Repository<User>,
  ) {}

  async logLogin(
    user: User,
    ip: string,
    platform: string,
    action: string = '登入系統',
  ): Promise<AuditLog> {
    const log = this.auditRepo.create({
      user,
      ip,
      platform,
      action,
    });
    return this.auditRepo.save(log);
  }


  async findAll(): Promise<AuditLog[]> {
    const logs = await this.auditRepo.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
    });

    console.log('🧾 logs =', logs); // 印出每一筆 log 的完整內容，含 user 關聯

    return logs;
  }


  async findWithFilters(currentUser: User, query: any): Promise<any[]> {
    const qb = this.auditRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.created_at', 'DESC');

    const isGlobal = ['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(currentUser.role);
    if (!isGlobal) {
      if (!currentUser.company?.id) return [];
      qb.andWhere('user.companyId = :companyId', {
        companyId: currentUser.company.id,
      });
    }

    if (query.username) {
      qb.andWhere('user.username ILIKE :username', {
        username: `%${query.username}%`,
      });
    }

    if (query.companyId) {
      qb.andWhere('user.companyId = :companyIdQuery', {
        companyIdQuery: Number(query.companyId),
      });
    }

    const limit = Number(query.limit) || 30;
    const page = Number(query.page) || 1;
    qb.take(limit).skip((page - 1) * limit);

    const logs = await qb.getMany();

    return logs.map((log) => ({
      id: log.id,
      username: log.user?.username || '未知使用者',
      ip: log.ip,
      platform: log.platform,
      action: log.action || '未知操作',
      created_at: log.created_at,
    }));
  }

  async archiveOldLogs(): Promise<{ archived: number }> {
    const result = await this.auditRepo.query(`
      WITH moved AS (
        INSERT INTO audit_log_archive (id, userId, ip, platform, action, created_at)
        SELECT id, "userId", ip, platform, action, created_at
        FROM audit_log
        WHERE created_at < NOW() - INTERVAL '1 year'
        RETURNING id
      )
      DELETE FROM audit_log WHERE id IN (SELECT id FROM moved);
    `);

    // TypeORM query() 沒有標準回傳格式，手動給一個簡單回應
    return { archived: Array.isArray(result) ? result.length : 0 };
  }


  async findByCompany(companyId: number): Promise<AuditLog[]> {
  if (!companyId) {
    console.warn('⚠️ 無 companyId，返回空 array');
    return [];
  }

  return this.auditRepo
    .createQueryBuilder('log')
    .leftJoinAndSelect('log.user', 'user')
    .where('user.companyId = :companyId', { companyId })

    .orderBy('log.created_at', 'DESC')
    .getMany();
}


}
