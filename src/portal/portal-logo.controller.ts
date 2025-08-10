import {
  Controller,
  Get,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { LogoService } from '../logo/logo.service';

@Controller('portal/logo')
export class PortalLogoController {
  constructor(private readonly logoService: LogoService) {}

  @Get()
  async getCompanyLogo(@Query('company') companyCode: string) {
    if (!companyCode) {
      throw new NotFoundException('Company code is required');
    }

    // 根據 companyCode 獲取 companyId
    const companyId = await this.getCompanyIdByCode(companyCode);
    
    const logo = await this.logoService.findByCompany(companyId);
    
    if (!logo) {
      return null; // 沒有 LOGO 時返回 null
    }

    return {
      id: logo.id,
      title: logo.title,
      image_url: logo.image_url,
    };
  }

  private async getCompanyIdByCode(companyCode: string): Promise<number> {
    // TODO: 實作根據 companyCode 獲取 companyId 的邏輯
    // 這裡暫時返回固定值，實際應該查詢 company 表
    const companyMap: { [key: string]: number } = {
      'a': 1,
      'b': 2,
    };
    
    const companyId = companyMap[companyCode];
    if (!companyId) {
      throw new NotFoundException('Company not found');
    }
    
    return companyId;
  }
}