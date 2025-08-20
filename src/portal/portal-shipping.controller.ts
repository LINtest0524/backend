import { Controller, Get, Query } from '@nestjs/common';
import { CompanyService } from '../company/company.service';

@Controller('portal/:companySlug/shipping')
export class PortalShippingController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('methods')
  async getShippingMethods(@Query('company') companySlug: string) {
    try {
      // 根據公司代碼獲取公司資訊
      const company = await this.companyService.findByCode(companySlug);
      
      if (!company) {
        return {
          success: false,
          message: '公司不存在',
          data: []
        };
      }

      // 返回啟用的運送方式
      const enabledShippingMethods = company.shipping_rules?.filter(rule => rule.enabled) || [];
      
      return {
        success: true,
        data: enabledShippingMethods
      };
    } catch (error) {
      console.error('獲取運送方式失敗:', error);
      return {
        success: false,
        message: '獲取運送方式失敗',
        data: []
      };
    }
  }
}