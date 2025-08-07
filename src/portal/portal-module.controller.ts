import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyModule } from '../company-module/company-module.entity';
import { Company } from '../company/company.entity';
import { MarqueeService } from '../marquee/marquee.service';

// @UseGuards(JwtAuthGuard)
@Controller('portal/module')
export class PortalModuleController {
  constructor(
    @InjectRepository(CompanyModule)
    private readonly moduleRepo: Repository<CompanyModule>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,

    private readonly marqueeService: MarqueeService,
  ) {}

  @Get('my-modules')
  async getMyModules(@Req() req: any) {
    const companyId = req.user?.companyId;
    if (!companyId) return [];

    const modules = await this.moduleRepo.find({
      where: { companyId, enabled: true },
    });

    return modules.map((m) => m.module_key);
  }

  @Post('my-modules')
  async updateMyModules(
    @Req() req: any,
    @Body()
    body: {
      moduleKey: string;
      enabled: boolean;
    },
  ) {
    const companyId = req.user?.companyId;
    if (!companyId) return { success: false };

    const { moduleKey, enabled } = body;

    let record = await this.moduleRepo.findOne({
      where: { companyId, module_key: moduleKey },
    });

    if (record) {
      record.enabled = enabled;
      record.pages ??= ['home'];
      record.exclude_pages ??= ['login'];
      await this.moduleRepo.save(record);
    } else {
      const newRecord = this.moduleRepo.create({
        companyId,
        module_key: moduleKey,
        enabled,
        pages: ['home'],
        exclude_pages: ['login'],
      });
      await this.moduleRepo.save(newRecord);
    }

    return { success: true };
  }

  @Get('public/module')
  async getPublicModules(@Query('company') companyCode: string) {
    const company = await this.companyRepo.findOne({
      where: { code: companyCode },
    });

    if (!company) return [];

    const modules = await this.moduleRepo.find({
      where: { companyId: company.id, enabled: true },
    });

    return modules.map((m) => m.module_key);
  }

  @Get('public/marquee')
  async getPublicMarquee(@Query('company') companyCode: string) {
    if (!companyCode) {
      throw new BadRequestException('缺少 company 參數');
    }

    const company = await this.companyRepo.findOne({
      where: { code: companyCode },
    });

    if (!company) {
      throw new BadRequestException(`找不到公司：${companyCode}`);
    }

    const isEnabled = await this.moduleRepo.findOne({
      where: {
        companyId: company.id,
        module_key: 'marquee',
        enabled: true,
      },
    });

    if (!isEnabled) return [];

    return this.marqueeService.findByCompany(company.id);
  }
}
