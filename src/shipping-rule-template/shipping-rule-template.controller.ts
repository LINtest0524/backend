import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ShippingRuleTemplateService } from './shipping-rule-template.service';
import { CreateShippingRuleTemplateDto } from './dto/create-shipping-rule-template.dto';
import { UpdateShippingRuleTemplateDto } from './dto/update-shipping-rule-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/shipping-rule-templates')
@UseGuards(JwtAuthGuard)
export class ShippingRuleTemplateController {
  constructor(private readonly shippingRuleTemplateService: ShippingRuleTemplateService) {}

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
    return this.shippingRuleTemplateService.findAll(companyId ? parseInt(companyId) : undefined);
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
    
    return this.shippingRuleTemplateService.update(+id, updateShippingRuleTemplateDto);
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
    
    return this.shippingRuleTemplateService.setDefault(+id);
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