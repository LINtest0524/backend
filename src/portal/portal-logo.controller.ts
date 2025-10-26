import {
  Controller,
  Get,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { LogoService } from '../logo/logo.service';
import { CompanyService } from '../company/company.service';

@Controller('portal/logo')
export class PortalLogoController {
  constructor(
    private readonly logoService: LogoService,
    private readonly companyService: CompanyService,
  ) {}

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
    const company = await this.companyService.findByCode(companyCode);
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    
    return company.id;
  }
}