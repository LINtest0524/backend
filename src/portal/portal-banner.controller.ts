import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from '../company/company.entity';
import { Banner } from '../banner/banner.entity';
import { Repository } from 'typeorm';

@Controller('portal/banner')
export class PortalBannerController {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,

    @InjectRepository(Banner)
    private readonly bannerRepo: Repository<Banner>,
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
