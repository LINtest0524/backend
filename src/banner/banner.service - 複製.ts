import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Banner } from './banner.entity';
import { Repository } from 'typeorm';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

const dayjs = require('dayjs');   // 輕量化時間套件
const formatTime = (val: any) => dayjs(val).format('YYYY/MM/DD HH:mm');


@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner)
    private bannerRepo: Repository<Banner>,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ✅ 合併 create，支援寫入操作紀錄（user / ip / platform 可選）
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

    // ✅ 有給 user 才寫 log
    if (user && ip && platform) {

      try {
  
        await this.auditLogService.record({
          user: { id: user.userId },
          action: `新增 Banner - ${saved.title || '（無標題）'}`,
          ip,
          platform,
          target: `banner:${saved.id}`,
          after: saved,
        });
      } catch (err) {
        console.error('⚠️ 操作紀錄寫入失敗:', err);
        // 不中斷流程
      }
    }


    return saved;
  }

  findAll(companyId: number) {
    return this.bannerRepo.find({
      where: { companyId },
      order: { sort: 'DESC' },
    });
  }

  findOne(id: number, companyId: number) {
    return this.bannerRepo.findOne({
      where: { id, companyId },
    });
  }







  // async update(
  //   id: number,
  //   data: UpdateBannerDto,
  //   user?: any,
  //   ip?: string,
  //   platform?: string,
  // ) {
  //   if (!data || Object.keys(data).length === 0) {
  //     throw new Error('更新資料不可為空');
  //   }

  //   const before = await this.bannerRepo.findOne({ where: { id } });
  //   if (!before) {
  //     throw new Error('找不到 Banner');
  //   }

  //   await this.bannerRepo.update(id, data);
  //   const after = await this.bannerRepo.findOne({ where: { id } });

  //   // ✅ 寫入操作紀錄
  //   if (
  //     this.auditLogService &&
  //     user &&
  //     ip &&
  //     platform
  //   ) {
  //     try {
  //       await this.auditLogService.record({
  //         user: { id: user.userId },
  //         action: `編輯 Banner - ${before.title || '（無標題）'}`,
  //         ip,
  //         platform,
  //         target: `banner:${id}`,
  //         before,
  //         after,
  //       });
  //     } catch (err) {
  //       console.error('⚠️ 操作紀錄寫入失敗:', err);
  //       // 不中斷流程
  //     }
  //   }

  //   return after;
  // }

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

  // 取得舊資料（含圖片欄位）
  const before = await this.bannerRepo.findOne({ where: { id }, relations: ['company'] });
  if (!before) throw new Error('找不到指定的 Banner');

  // 更新
  await this.bannerRepo.update(id, data);
  const after = await this.bannerRepo.findOne({ where: { id } });

  // ✅ 寫入操作紀錄（僅在有 user 時）
  if (user && ip && platform && before && after) {
    const diffText = this.generateBannerDiff(before, after);

    try {
      await this.auditLogService.record({
        user: { id: user.userId },
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

// ✅ 比對變動欄位
// ✅ 比對變動欄位（完整無紅線）
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


  const formatTime = (val: string | Date) =>
    dayjs(val).format('YYYY/MM/DD HH:mm'); // 用 dayjs 格式化

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
    const banner = await this.bannerRepo.findOne({ where: { id } });

    if (!banner) {
      throw new Error('Banner 不存在');
    }

    const result = await this.bannerRepo.delete(id);

    // ✅ 有給 user 才寫 log
    if (user && ip && platform) {
      try {
        console.log('🧾 寫入 Banner 刪除紀錄');
        await this.auditLogService.record({
          user: { id: user.userId },
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
