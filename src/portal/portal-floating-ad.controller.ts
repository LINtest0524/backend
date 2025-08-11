import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from '../company/company.entity';
import { FloatingAd, FloatingAdStatus } from '../floating-ad/floating-ad.entity';
import { Repository } from 'typeorm';

@Controller('portal/floating-ads')
export class PortalFloatingAdController {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,

    @InjectRepository(FloatingAd)
    private readonly floatingAdRepo: Repository<FloatingAd>,
  ) {}

  @Get()
  async getFloatingAds(@Query('company') companyCode: string) {
    if (!companyCode) {
      throw new BadRequestException('缺少 company 參數');
    }

    const company = await this.companyRepo.findOne({
      where: { code: companyCode },
    });

    if (!company) {
      throw new BadRequestException(`not found公司：${companyCode}`);
    }

    const floatingAds = await this.floatingAdRepo.find({
      where: { 
        companyId: company.id,
        status: FloatingAdStatus.ACTIVE
      },
      order: { sort: 'ASC', id: 'DESC' },
    });

    return floatingAds;
  }
}