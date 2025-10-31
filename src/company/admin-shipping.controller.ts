import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CompanyService } from '../company/company.service';

@Controller('company')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminShippingController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('shipping-rules')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  async getShippingRules(@Request() req) {
    try {
      const user = req.user;
      let companyId = user.companyId || user.company_id; // 支援兩種欄位名稱

      // 如果是超級管理員或全域管理員，可能需要指定公司ID
      if (['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role) && req.query.company_id) {
        companyId = parseInt(req.query.company_id);
      }
      
      // 如果還是沒有 companyId，嘗試從 URL 參數獲取
      if (!companyId && req.query.company_code) {
        const company = await this.companyService.findByCode(req.query.company_code);
        if (company) {
          companyId = company.id;
        }
      }
      

      if (!companyId) {
        return {
          success: false,
          message: '無法確定公司資訊',
          data: []
        };
      }

      const company = await this.companyService.findById(companyId);
      
      if (!company) {
        return {
          success: false,
          message: '公司不存在',
          data: []
        };
      }


      return {
        success: true,
        data: company.shipping_rules || []
      };
    } catch (error) {
      console.error('獲取運送規則失敗:', error);
      return {
        success: false,
        message: '獲取運送規則失敗',
        data: []
      };
    }
  }

  @Put('shipping-rules')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  async updateShippingRules(@Request() req, @Body() body: { shipping_rules: any[]; company_id?: number; company_code?: string }) {
    try {
      const user = req.user;
      let companyId = user.companyId || user.company_id; // 支援兩種欄位名稱

      // 如果是超級管理員或全域管理員，可能需要指定公司ID
      if (['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role) && body.company_id) {
        companyId = body.company_id;
      }
      
      // 如果還是沒有 companyId，嘗試從 body 中的 company_code 獲取
      if (!companyId && body.company_code) {
        const company = await this.companyService.findByCode(body.company_code);
        if (company) {
          companyId = company.id;
        }
      }
      

      if (!companyId) {
        return {
          success: false,
          message: '無法確定公司資訊'
        };
      }

      // 驗證運送規則格式
      const { shipping_rules } = body;
      if (!Array.isArray(shipping_rules)) {
        return {
          success: false,
          message: '運送規則格式錯誤'
        };
      }

      // 驗證每個運送規則的必要欄位
      for (const rule of shipping_rules) {
        if (!rule.id || !rule.name || typeof rule.fee !== 'number' || typeof rule.freeThreshold !== 'number') {
          return {
            success: false,
            message: '運送規則欄位不完整'
          };
        }
      }

      await this.companyService.updateShippingRules(companyId, shipping_rules);

      return {
        success: true,
        message: '運送規則更新成功'
      };
    } catch (error) {
      console.error('更新運送規則失敗:', error);
      return {
        success: false,
        message: '更新運送規則失敗'
      };
    }
  }
}