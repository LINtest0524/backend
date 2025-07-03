import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { MarqueeService } from './marquee.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../company/company.entity';
import { CompanyModule } from '../company-module/company-module.entity';

@Controller()
export class MarqueeController {
  constructor(
    private readonly marqueeService: MarqueeService,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,

    @InjectRepository(CompanyModule)
    private readonly companyModuleRepo: Repository<CompanyModule>,
  ) {}

  // ✅ 前台 API
  @Get('portal/marquee')
  async getForPortal(@Query('company') companyCode: string) {
    if (!companyCode) {
      throw new BadRequestException('缺少 company 參數');
    }

    const company = await this.companyRepo.findOne({
      where: { code: companyCode },
    });

    if (!company) {
      throw new BadRequestException(`找不到公司：${companyCode}`);
    }

    const isEnabled = await this.companyModuleRepo.findOne({
      where: {
        companyId: company.id,
        module_key: 'marquee',
        enabled: true,
      },
    });

    if (!isEnabled) return [];

    return this.marqueeService.findByCompany(company.id);
  }

  // ✅ 後台 API
  @Get('admin/marquee/:companyId')
  getAll(@Param('companyId') companyId: number) {
    return this.marqueeService.findAll(companyId);
  }

  @Get('admin/marquee/item/:id')
  getOne(@Param('id') id: number) {
    return this.marqueeService.findOne(id);
  }

  @Post('admin/marquee')
  create(@Body() body: any) {
    return this.marqueeService.create(body, { id: body.companyId } as any);
  }

  @Put('admin/marquee/:id')
  update(@Param('id') id: number, @Body() body: any) {
    return this.marqueeService.update(id, body);
  }

  @Delete('admin/marquee/:id')
  delete(@Param('id') id: number) {
    return this.marqueeService.remove(id);
  }
}
