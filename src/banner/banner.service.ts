import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Banner } from './banner.entity';
import { Repository } from 'typeorm';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

const dayjs = require('dayjs'); // 輕量化時間套件
const formatTime = (val: any) => dayjs(val).format('YYYY/MM/DD HH:mm');

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner)
    private bannerRepo: Repository<Banner>,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ✅ 將 UTC 時間轉為 datetime-local 字串
  private formatBannerDatetime(banner: Banner): any  {
    const toDatetimeLocal = (val?: Date | string | null) => {
      if (!val) return null;
      const dt = new Date(val);
      const tzOffset = dt.getTimezoneOffset() * 60000;
      return new Date(dt.getTime() - tzOffset).toISOString().slice(0, 16);
    };

    return {
      ...banner,
      start_time: toDatetimeLocal(banner.start_time),
      end_time: toDatetimeLocal(banner.end_time),
    };
  }

  async create(
    data: CreateBannerDto,
    user?: any,
    ip?: string,
    platform?: string,
  ) {
    const banner = this.bannerRepo.create({
      title: data.title,
      desktop_image_url: data.desktop_image_url,
      mobile_image_url: data.mobile_image_url,
      start_time: data.start_time,
      end_time: data.end_time,
      sort: data.sort,
      status: data.status,
      company: { id: data.company.id },
    });

    const saved = await this.bannerRepo.save(banner);

    if (user && ip && platform) {
      try {
        await this.auditLogService.record({
          user: { id: user.userId ?? user.id },
          action: `新增 Banner - ${saved.title || '（無標題）'}`,
          ip,
          platform,
          target: `banner:${saved.id}`,
          after: saved,
        });
      } catch (err) {
        console.error('⚠️ 操作紀錄寫入失敗:', err);
      }
    }

    return saved;
  }

  findAll(companyId: number) {
    return this.bannerRepo.find({
      where: { companyId },
      order: { sort: 'DESC' },
    }).then(list => list.map(this.formatBannerDatetime));
  }

  findOne(id: number, companyId: number) {
    return this.bannerRepo.findOne({
      where: { id, companyId },
    }).then(b => b ? this.formatBannerDatetime(b) : null);
  }

  async update(
    id: number,
    data: UpdateBannerDto,
    user?: any,
    ip?: string,
    platform?: string,
  ) {
    if (!data || Object.keys(data).length === 0) {
      throw new Error('更新資料不可為空');
    }

    const userCompanyId = user?.company?.id;
    const before = await this.bannerRepo.findOne({ 
      where: { id, companyId: userCompanyId }, 
      relations: ['company'] 
    });
    if (!before) throw new Error('找不到指定的 Banner 或無權限操作');

    await this.bannerRepo.update(id, data);
    const after = await this.bannerRepo.findOne({ where: { id } });

    if (user && ip && platform && before && after) {
      const diffText = this.generateBannerDiff(before, after);

      try {
        await this.auditLogService.record({
          user: { id: user.userId ?? user.id },
          action: `編輯 Banner - ${before.title}（${diffText || '未變動'}）`,
          ip,
          platform,
          target: `banner:${id}`,
          before,
          after,
        });
      } catch (err) {
        console.error('⚠️ Banner 編輯紀錄寫入失敗:', err);
      }
    }

    return after;
  }

  private generateBannerDiff(before: any, after: any): string {
    const diffs: string[] = [];

    if (before?.title !== after?.title) {
      diffs.push(`📝 標題：${before?.title} → ${after?.title}`);
    }

    if (before?.status !== after?.status) {
      diffs.push(`📘 狀態：${before?.status} → ${after?.status}`);
    }

    if (before?.sort !== after?.sort) {
      diffs.push(`🔢 排序：${before?.sort} → ${after?.sort}`);
    }

    if (before?.start_time && after?.start_time) {
      const beforeTime = new Date(before.start_time);
      const afterTime = new Date(after.start_time);
      if (beforeTime.getTime() !== afterTime.getTime()) {
        diffs.push(`🕐 上架時間：${formatTime(beforeTime)} → ${formatTime(afterTime)}`);
      }
    }

    if (before?.end_time && after?.end_time) {
      const beforeEnd = new Date(before.end_time);
      const afterEnd = new Date(after.end_time);
      if (beforeEnd.getTime() !== afterEnd.getTime()) {
        diffs.push(`📅 下架時間：${formatTime(beforeEnd)} → ${formatTime(afterEnd)}`);
      }
    }

    if (before?.desktop_image_url !== after?.desktop_image_url) {
      diffs.push(`🖼️ 電腦圖片已更換`);
    }

    if (before?.mobile_image_url !== after?.mobile_image_url) {
      diffs.push(`📱 手機圖片已更換`);
    }

    return diffs.join('、');
  }

  async remove(id: number, user?: any, ip?: string, platform?: string) {
    const userCompanyId = user?.company?.id;
    const banner = await this.bannerRepo.findOne({ 
      where: { id, companyId: userCompanyId } 
    });

    if (!banner) {
      throw new Error('Banner 不存在或無權限操作');
    }

    const result = await this.bannerRepo.delete(id);

    if (user && ip && platform) {
      try {
        await this.auditLogService.record({
          user: { id: user.userId ?? user.id },
          action: `刪除 Banner - ${banner.title || '（無標題）'}`,
          ip,
          platform,
          target: `banner:${banner.id}`,
          before: banner,
        });
      } catch (err) {
        console.error('⚠️ 刪除紀錄寫入失敗:', err);
      }
    }

    return result;
  }
}
