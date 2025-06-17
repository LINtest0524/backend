import {
  Controller,
  Get,
  Post,
  Body,
} from '@nestjs/common'
import { CompanyModuleService } from './company-module.service'

@Controller('admin/module')
export class CompanyModuleController {
  constructor(private readonly companyModuleService: CompanyModuleService) {}

  // 取得所有公司對 marquee 的設定（給後台用）
  @Get('marquee')
  getMarqueeSettings() {
    return this.companyModuleService.getModuleSettings('marquee')
  }

  // 儲存設定
  @Post('marquee')
  updateMarqueeSettings(@Body() body: { companyId: number; enabled: boolean }[]) {
    return this.companyModuleService.updateModuleSettings('marquee', body)
  }
}