import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Banner } from './banner.entity';
import { Repository } from 'typeorm';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

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
        console.log('🧾 寫入 Banner 操作紀錄');
        await this.auditLogService.record({
          user: { id: user.userId },
          action: `操作: 新增 Banner`,
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

  async update(id: number, data: UpdateBannerDto) {
    if (!data || Object.keys(data).length === 0) {
      throw new Error('更新資料不可為空');
    }

    return this.bannerRepo.update(id, data);
  }


  remove(id: number) {
    return this.bannerRepo.delete(id);
  }
}
