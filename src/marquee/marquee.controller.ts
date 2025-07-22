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
  Req,
  UseGuards,
} from '@nestjs/common';
import { MarqueeService } from './marquee.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../company/company.entity';
import { CompanyModule } from '../company-module/company-module.entity';
import * as UAParser from 'ua-parser-js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
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
  // @Get('admin/marquee/:companyId')
  // getAll(@Param('companyId') companyId: number) {
  //   return this.marqueeService.findAll(companyId);
  // }

  @Get('admin/marquee')
  async getAll(@Req() req: any) {
    const user = req.user;
    const companyId = user?.companyId ?? null; // 沒有也沒關係
    return this.marqueeService.findAll(companyId);
  }




  @Get('admin/marquee/item/:id')
  getOne(@Param('id') id: number) {
    return this.marqueeService.findOne(id);
  }

  @Post('admin/marquee')
  async create(@Body() body: any, @Req() req: any) {
    const user = req.user;
    const ip = req.ip;

    const uaString = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(uaString);
    const info = parser.getResult();
    const deviceType = info.device.type ?? 'desktop';
    const device =
      deviceType === 'mobile' ? '手機' :
      deviceType === 'tablet' ? '平板' : '電腦';
    const os = `${info.os.name ?? ''} ${info.os.version ?? ''}`.trim();
    const browser = `${info.browser.name ?? ''} ${info.browser.version ?? ''}`.trim();
    const platform = `${device} / ${os} / ${browser}`;

    return this.marqueeService.create(body, { id: body.companyId } as any, user, ip, platform);
  }

  @Put('admin/marquee/:id')
  async update(@Param('id') id: number, @Body() body: any, @Req() req: any) {
    const user = req.user;
    const ip = req.ip;

    const uaString = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(uaString);
    const info = parser.getResult();
    const deviceType = info.device.type ?? 'desktop';
    const device =
      deviceType === 'mobile' ? '手機' :
      deviceType === 'tablet' ? '平板' : '電腦';
    const os = `${info.os.name ?? ''} ${info.os.version ?? ''}`.trim();
    const browser = `${info.browser.name ?? ''} ${info.browser.version ?? ''}`.trim();
    const platform = `${device} / ${os} / ${browser}`;

    return this.marqueeService.update(id, body, user, ip, platform);
  }

  @Delete('admin/marquee/:id')
  async delete(@Param('id') id: number, @Req() req: any) {
    const user = req.user;
    const ip = req.ip;

    const uaString = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(uaString);
    const info = parser.getResult();
    const deviceType = info.device.type ?? 'desktop';
    const device =
      deviceType === 'mobile' ? '手機' :
      deviceType === 'tablet' ? '平板' : '電腦';
    const os = `${info.os.name ?? ''} ${info.os.version ?? ''}`.trim();
    const browser = `${info.browser.name ?? ''} ${info.browser.version ?? ''}`.trim();
    const platform = `${device} / ${os} / ${browser}`;

    return this.marqueeService.remove(id, user, ip, platform);
  }
}
