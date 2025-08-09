import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FloatingAd, FloatingAdStatus } from './floating-ad.entity';
import { CreateFloatingAdDto } from './dto/create-floating-ad.dto';
import { UpdateFloatingAdDto } from './dto/update-floating-ad.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class FloatingAdService {
  constructor(
    @InjectRepository(FloatingAd)
    private floatingAdRepo: Repository<FloatingAd>,

    private auditLogService: AuditLogService,
  ) {}

  async findAll(companyId: number): Promise<FloatingAd[]> {
    return this.floatingAdRepo.find({
      where: { companyId },
      order: { sort: 'ASC', id: 'DESC' },
    });
  }

  async findOne(id: number, companyId: number): Promise<FloatingAd | null> {
    return this.floatingAdRepo.findOne({
      where: { id, companyId },
    });
  }

  async findActive(companyId: number): Promise<FloatingAd[]> {
    return this.floatingAdRepo.find({
      where: { 
        companyId, 
        status: FloatingAdStatus.ACTIVE 
      },
      order: { sort: 'ASC', id: 'DESC' },
    });
  }

  async create(
    data: CreateFloatingAdDto,
    user: any,
    ip: string,
    platform: string,
  ): Promise<FloatingAd> {
    const floatingAd = this.floatingAdRepo.create(data);
    const saved = await this.floatingAdRepo.save(floatingAd);

    // 寫入審計日誌
    await this.auditLogService.create({
      action: 'CREATE',
      target: 'FLOATING_AD',
      targetId: saved.id,
      user: user,
      ip: ip,
      platform: platform,
      snapshot: saved,
    });

    return saved;
  }

  async update(
    id: number,
    data: UpdateFloatingAdDto,
    user: any,
    ip: string,
    platform: string,
  ): Promise<FloatingAd> {
    const userCompanyId = user.company?.id;
    const before = await this.findOne(id, userCompanyId);
    if (!before) {
      throw new Error('浮動廣告不存在或無權限操作');
    }

    await this.floatingAdRepo.update({ id, companyId: userCompanyId }, data);
    const after = await this.findOne(id, userCompanyId);
    
    if (!after) {
      throw new Error('更新後找不到浮動廣告');
    }

    // 生成變更說明
    const changes = this.generateChanges(before, after);

    // 寫入審計日誌
    await this.auditLogService.create({
      action: 'UPDATE',
      target: 'FLOATING_AD',
      targetId: id,
      user: user,
      ip: ip,
      platform: platform,
      snapshot: { before, after, changes },
    });

    return after;
  }

  async remove(
    id: number,
    user: any,
    ip: string,
    platform: string,
  ): Promise<void> {
    const userCompanyId = user.company?.id;
    const floatingAd = await this.findOne(id, userCompanyId);
    if (!floatingAd) {
      throw new Error('浮動廣告不存在或無權限操作');
    }

    await this.floatingAdRepo.delete({ id, companyId: userCompanyId });

    // 寫入審計日誌
    await this.auditLogService.create({
      action: 'DELETE',
      target: 'FLOATING_AD',
      targetId: id,
      user: user,
      ip: ip,
      platform: platform,
      snapshot: floatingAd,
    });
  }

  private generateChanges(before: FloatingAd, after: FloatingAd): string {
    const changes: string[] = [];

    if (before.title !== after.title) {
      changes.push(`標題：${before.title} → ${after.title}`);
    }
    if (before.link_url !== after.link_url) {
      changes.push(`連結：${before.link_url} → ${after.link_url}`);
    }
    if (before.status !== after.status) {
      const statusMap = { ACTIVE: '啟用', INACTIVE: '停用' };
      changes.push(`狀態：${statusMap[before.status]} → ${statusMap[after.status]}`);
    }
    if (before.position !== after.position) {
      changes.push(`位置：${before.position} → ${after.position}`);
    }
    if (before.target_blank !== after.target_blank) {
      changes.push(`開啟方式：${before.target_blank ? '新視窗' : '同視窗'} → ${after.target_blank ? '新視窗' : '同視窗'}`);
    }

    return changes.join('，');
  }
}