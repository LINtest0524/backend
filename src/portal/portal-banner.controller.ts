import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from '../company/company.entity';
import { Banner } from '../banner/banner.entity';
import { CompanyModule } from '../company-module/company-module.entity';
import { Repository } from 'typeorm';

@Controller('portal/banner')
export class PortalBannerController {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,

    @InjectRepository(Banner)
    private readonly bannerRepo: Repository<Banner>,

    @InjectRepository(CompanyModule)
    private readonly companyModuleRepo: Repository<CompanyModule>,
  ) {}

  @Get()
  async getBanners(@Query('company') companyCode: string) {
    if (!companyCode) {
      throw new BadRequestException('缺少 company 參數');
    }

    const company = await this.companyRepo.findOne({
      where: { code: companyCode },
    });

    if (!company) {
      throw new BadRequestException(`找不到公司：${companyCode}`);
    }

    // ✅ 模組是否啟用（重點！）
    const isBannerEnabled = await this.companyModuleRepo.findOne({
      where: {
        companyId: company.id,
        module_key: 'banner',
        enabled: true,
      },
    });

    if (!isBannerEnabled) {
      return []; // ❌ 沒啟用 banner 模組 → 回傳空陣列
    }

    const now = new Date();

    const banners = await this.bannerRepo
      .createQueryBuilder('banner')
      .where('banner.companyId = :companyId', { companyId: company.id })
      .andWhere('banner.status = :status', { status: 'ACTIVE' })
      .andWhere('banner.start_time <= :now', { now })
      .andWhere('banner.end_time >= :now', { now })
      .orderBy('banner.sort', 'ASC')
      .getMany();

    return banners;
  }
}
