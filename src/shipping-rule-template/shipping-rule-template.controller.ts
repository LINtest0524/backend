import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ShippingRuleTemplateService } from './shipping-rule-template.service';
import { CreateShippingRuleTemplateDto } from './dto/create-shipping-rule-template.dto';
import { UpdateShippingRuleTemplateDto } from './dto/update-shipping-rule-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyService } from '../company/company.service';

@Controller('admin/shipping-rule-templates')
@UseGuards(JwtAuthGuard)
export class ShippingRuleTemplateController {
  constructor(
    private readonly shippingRuleTemplateService: ShippingRuleTemplateService,
    private readonly companyService: CompanyService
  ) {}

  @Post()
  create(@Request() req: any, @Body() createShippingRuleTemplateDto: CreateShippingRuleTemplateDto) {
    // 代理商建立的運費規則自動設定為自己的公司
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      createShippingRuleTemplateDto.company_id = userCompanyId;
    }
    
    return this.shippingRuleTemplateService.create(createShippingRuleTemplateDto);
  }

  @Get()
  findAll(@Request() req: any, @Query('companyId') companyId?: string) {
    // 權限檢查：代理商只能查看自己公司的運費規則
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      // 代理商只能查看自己公司的運費規則
      return this.shippingRuleTemplateService.findAll(userCompanyId);
    }
    
    // 超級管理員可以指定 companyId 或查看所有
    const targetCompanyId = companyId ? parseInt(companyId) : undefined;
    return this.shippingRuleTemplateService.findAll(targetCompanyId);
  }

  @Get('default')
  findDefault(@Request() req: any, @Query('companyId') companyId?: string) {
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      return this.shippingRuleTemplateService.findDefault(userCompanyId);
    }
    
    return this.shippingRuleTemplateService.findDefault(companyId ? parseInt(companyId) : undefined);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const template = await this.shippingRuleTemplateService.findOne(+id);
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    // 權限檢查：代理商只能查看自己公司的運費規則
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      if (template.company_id !== userCompanyId) {
        throw new Error('無權限訪問此運費規則');
      }
    }
    
    return template;
  }

  @Patch(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() updateShippingRuleTemplateDto: UpdateShippingRuleTemplateDto) {
    const template = await this.shippingRuleTemplateService.findOne(+id);
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    // 權限檢查：代理商只能修改自己公司的運費規則
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      if (template.company_id !== userCompanyId) {
        throw new Error('無權限修改此運費規則');
      }
    }
    
    const result = await this.shippingRuleTemplateService.update(+id, updateShippingRuleTemplateDto);
    
    // 如果設置為預設，自動同步到公司
    if (updateShippingRuleTemplateDto.is_default === true) {
      await this.syncTemplateToCompany(template.company_id);
    }
    
    return result;
  }

  @Patch(':id/set-default')
  async setDefault(@Request() req: any, @Param('id') id: string) {
    const template = await this.shippingRuleTemplateService.findOne(+id);
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    // 權限檢查：代理商只能設定自己公司的運費規則為預設
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      if (template.company_id !== userCompanyId) {
        throw new Error('無權限設定此運費規則為預設');
      }
    }
    
    const result = await this.shippingRuleTemplateService.setDefault(+id);
    
    // 同步到公司的運費規則
    await this.syncTemplateToCompany(template.company_id);
    
    return result;
  }

  @Post(':id/apply-to-company')
  async applyToCompany(@Request() req: any, @Param('id') id: string) {
    const template = await this.shippingRuleTemplateService.findOne(+id);
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    // 權限檢查
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      if (template.company_id !== userCompanyId) {
        throw new Error('無權限應用此運費規則');
      }
    }
    
    await this.syncTemplateToCompany(template.company_id);
    
    return { success: true, message: '運費規則已應用到公司' };
  }

  private async syncTemplateToCompany(companyId: number) {
    try {
      // 獲取公司的預設運費規則模板
      const defaultTemplate = await this.shippingRuleTemplateService.findDefault(companyId);
      
      if (!defaultTemplate || !defaultTemplate.items) {
        return;
      }
      
      // 轉換模板項目為公司運費規則格式
      const shippingRules = defaultTemplate.items.map(item => ({
        id: `template_${item.id}`,
        name: item.method,
        fee: item.base_fee,
        freeThreshold: item.free_shipping_threshold,
        description: `來自模板: ${defaultTemplate.name}`,
        enabled: true
      }));
      
      // 更新公司的運費規則
      await this.companyService.updateShippingRules(companyId, shippingRules);
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    const template = await this.shippingRuleTemplateService.findOne(+id);
    const userCompanyId = req.user.companyId || req.user.company_id;
    
    // 權限檢查：代理商只能刪除自己公司的運費規則
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      if (template.company_id !== userCompanyId) {
        throw new Error('無權限刪除此運費規則');
      }
    }
    
    return this.shippingRuleTemplateService.remove(+id);
  }
}

// Portal API for frontend product pages
@Controller('portal/shipping-rule-templates')
export class PortalShippingRuleTemplateController {
  constructor(private readonly shippingRuleTemplateService: ShippingRuleTemplateService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    return this.shippingRuleTemplateService.findAll(companyId ? parseInt(companyId) : undefined);
  }

  @Get('default')
  findDefault(@Query('companyId') companyId?: string) {
    return this.shippingRuleTemplateService.findDefault(companyId ? parseInt(companyId) : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shippingRuleTemplateService.findOne(+id);
  }
}