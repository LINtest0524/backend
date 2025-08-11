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
import { MarqueeTagService } from './marquee-tag.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../company/company.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MarqueeTagController {
  constructor(
    private readonly marqueeTagService: MarqueeTagService,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  // 前台 API - 獲取標籤
  @Get('portal/marquee-tags')
  async getForPortal(@Query('company') companyCode: string) {
    if (!companyCode) {
      throw new BadRequestException('缺少 company 參數');
    }

    const company = await this.companyRepo.findOne({
      where: { code: companyCode },
    });

    if (!company) {
      throw new BadRequestException(`not found公司：${companyCode}`);
    }

    return this.marqueeTagService.findByCompany(company.id);
  }

  // 後台 API
  @Get('admin/marquee-tags')
  async getAll(@Req() req: any) {
    const user = req.user;
    const companyId = user?.companyId ?? null;
    return this.marqueeTagService.findAll(companyId);
  }

  @Get('admin/marquee-tags/item/:id')
  getOne(@Param('id') id: number) {
    return this.marqueeTagService.findOne(id);
  }

  @Post('admin/marquee-tags')
  async create(@Body() body: any, @Req() req: any) {
    const user = req.user;
    const company = await this.companyRepo.findOne({
      where: { id: body.companyId }
    });
    
    if (!company) {
      throw new BadRequestException('not found指定的公司');
    }

    return this.marqueeTagService.create(body, company);
  }

  @Put('admin/marquee-tags/:id')
  async update(@Param('id') id: number, @Body() body: any) {
    return this.marqueeTagService.update(id, body);
  }

  @Delete('admin/marquee-tags/:id')
  async delete(@Param('id') id: number) {
    return this.marqueeTagService.remove(id);
  }
}