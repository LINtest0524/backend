import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marquee } from './marquee.entity';
import { Company } from '../company/company.entity';
import { CompanyModule } from '../company-module/company-module.entity';
import { AuditLogService } from '../audit-log/audit-log.service';


const { toTaiwanDisplayTime } = require('../common/utils/time.util');





 // ✅ 使用台灣時間顯示工具

@Injectable()
export class MarqueeService {
  constructor(
    @InjectRepository(Marquee)
    private marqueeRepo: Repository<Marquee>,

    @InjectRepository(Company)
    private companyRepo: Repository<Company>,

    @InjectRepository(CompanyModule)
    private companyModuleRepo: Repository<CompanyModule>,

    private readonly auditLogService: AuditLogService,
  ) {}

  private formatTimeFields(item: Marquee): any {
    return {
      ...item,
      createdAt: toTaiwanDisplayTime(item.createdAt),
      updatedAt: toTaiwanDisplayTime(item.updatedAt),
    };
  }

  async findAll(companyId: number) {
    const list = await this.marqueeRepo.find({
      where: { company: { id: companyId } },
      order: { createdAt: 'DESC' },
    });
    return list.map(this.formatTimeFields);
  }

  async findOne(id: number) {
    const item = await this.marqueeRepo.findOne({ where: { id } });
    return item ? this.formatTimeFields(item) : null;
  }

  async create(
    data: Partial<Marquee>,
    company: Company,
    user?: any,
    ip?: string,
    platform?: string,
  ) {
    const item = this.marqueeRepo.create({ ...data, company });
    const saved = await this.marqueeRepo.save(item);

    if (user && ip && platform) {
      try {
        await this.auditLogService.record({
          user: { id: user.userId },
          action: `新增跑馬燈 - ${saved.content?.slice(0, 10) || '（無內容）'}`,
          ip,
          platform,
          target: `marquee:${saved.id}`,
          after: saved,
        });
      } catch (err) {
        console.error('⚠️ 跑馬燈新增紀錄失敗:', err);
      }
    }

    return saved;
  }

  async update(
    id: number,
    data: Partial<Marquee>,
    user?: any,
    ip?: string,
    platform?: string,
  ) {
    if (!data || Object.keys(data).length === 0) {
      throw new Error('更新資料不可為空');
    }

    const before = await this.marqueeRepo.findOne({ where: { id } });
    if (!before) throw new Error('找不到指定跑馬燈');

    await this.marqueeRepo.update(id, data);
    const after = await this.marqueeRepo.findOne({ where: { id } });

    if (user && ip && platform && before && after) {
      const diffText = this.generateMarqueeDiff(before, after);
      try {
        await this.auditLogService.record({
          user: { id: user.userId },
          action: `編輯跑馬燈 - ${before.content?.slice(0, 10) || '（無內容）'}（${diffText || '未變動'}）`,
          ip,
          platform,
          target: `marquee:${id}`,
          before,
          after,
        });
      } catch (err) {
        console.error('⚠️ 跑馬燈編輯紀錄失敗:', err);
      }
    }

    return after;
  }

  async remove(id: number, user?: any, ip?: string, platform?: string) {
    const before = await this.marqueeRepo.findOne({ where: { id } });
    if (!before) throw new Error('跑馬燈不存在');

    const result = await this.marqueeRepo.delete(id);

    if (user && ip && platform) {
      try {
        await this.auditLogService.record({
          user: { id: user.userId },
          action: `刪除跑馬燈 - ${before.content?.slice(0, 10) || '（無內容）'}`,
          ip,
          platform,
          target: `marquee:${before.id}`,
          before,
        });
      } catch (err) {
        console.error('⚠️ 跑馬燈刪除紀錄失敗:', err);
      }
    }

    return result;
  }

  async findByCompanyCode(companyCode: string): Promise<Marquee[]> {
    const company = await this.companyRepo.findOne({ where: { code: companyCode } });
    if (!company) return [];

    const isEnabled = await this.companyModuleRepo.findOne({
      where: {
        companyId: company.id,
        module_key: 'marquee',
        enabled: true,
      },
    });

    if (!isEnabled) return [];

    const list = await this.marqueeRepo.find({
      where: {
        company: { id: company.id },
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });

    return list.map(this.formatTimeFields);
  }

  async findByCompany(companyId: number) {
    const list = await this.marqueeRepo.find({
      where: {
        company: { id: companyId },
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });
    return list.map(this.formatTimeFields);
  }

  private generateMarqueeDiff(before: any, after: any): string {
    const diffs: string[] = [];

    if (before?.content !== after?.content) {
      diffs.push(`📝 內容異動`);
    }

    if (before?.isActive !== after?.isActive) {
      diffs.push(`🔔 狀態：${before.isActive ? '啟用' : '停用'} → ${after.isActive ? '啟用' : '停用'}`);
    }

    return diffs.join('、');
  }
}
