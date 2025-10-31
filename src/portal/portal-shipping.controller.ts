import { Controller, Get, Query } from '@nestjs/common';
import { CompanyService } from '../company/company.service';

@Controller('portal/:companySlug/shipping')
export class PortalShippingController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('methods')
  async getShippingMethods(@Query('company') companySlug: string) {
    try {
      // 根據公司代碼獲取公司資訊
      let company = await this.companyService.findByCode(companySlug);
      
      // 如果找不到公司，嘗試直接用 ID 查找（向後兼容）
      if (!company && companySlug === 'a') {
        company = await this.companyService.findById(3);
      }
      
      if (!company) {
        return {
          success: false,
          message: '公司不存在',
          data: []
        };
      }

      // 檢查運送規則是否為有效陣列
      const shippingRules = Array.isArray(company.shipping_rules) ? company.shipping_rules : [];

      // 返回啟用的運送方式
      const enabledShippingMethods = shippingRules.filter(rule => rule && rule.enabled === true);
      
      return {
        success: true,
        data: enabledShippingMethods
      };
    } catch (error) {
      return {
        success: false,
        message: '獲取運送方式失敗',
        data: []
      };
    }
  }
}