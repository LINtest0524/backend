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

interface FindFilteredParams {
  currentUser: any;
  from?: string;
  to?: string;
  search?: string;
  user?: string;
  ip?: string;
  target?: string;
  page: number;
  limit: number;
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
      user: { id: userId },
      action,
      ip,
      platform,
      target,
      before,
      after,
    });

    return this.logRepo.save(log);
  }

  async findAll(): Promise<AuditLog[]> {
    return this.logRepo.find({
      order: { created_at: 'DESC' },
      relations: ['user'],
    });
  }

  async findFiltered(params: FindFilteredParams) {
    const {
      currentUser,
      from,
      to,
      search,
      user,
      ip,
      target,
      page,
      limit,
    } = params;

    const qb = this.logRepo.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.created_at', 'DESC');

    if (
      currentUser.role === 'AGENT_OWNER' ||
      currentUser.role === 'AGENT_SUPPORT'
    ) {
      qb.andWhere('user.companyId = :companyId', { companyId: currentUser.companyId });
    }

    if (from) {
      qb.andWhere('log.created_at >= :from', { from: `${from} 00:00:00` });
    }

    if (to) {
      qb.andWhere('log.created_at <= :to', { to: `${to} 23:59:59` });
    }

    if (search) {
      qb.andWhere('log.action LIKE :search', { search: `%${search}%` });
    }

    if (user) {
      qb.andWhere('user.username LIKE :user', { user: `%${user}%` });
    }

    if (ip) {
      qb.andWhere('log.ip LIKE :ip', { ip: `%${ip}%` });
    }

    if (target) {
      qb.andWhere('log.target LIKE :target', { target: `%${target}%` });
    }

    const totalCount = await qb.getCount();

    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      totalCount,
      totalPages,
    };
  }
}
