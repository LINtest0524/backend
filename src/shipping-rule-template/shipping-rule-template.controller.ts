import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ShippingRuleTemplateService } from './shipping-rule-template.service';
import { CreateShippingRuleTemplateDto } from './dto/create-shipping-rule-template.dto';
import { UpdateShippingRuleTemplateDto } from './dto/update-shipping-rule-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/shipping-rule-templates')
@UseGuards(JwtAuthGuard)
export class ShippingRuleTemplateController {
  constructor(private readonly shippingRuleTemplateService: ShippingRuleTemplateService) {}

  @Post()
  create(@Body() createShippingRuleTemplateDto: CreateShippingRuleTemplateDto) {
    return this.shippingRuleTemplateService.create(createShippingRuleTemplateDto);
  }

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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateShippingRuleTemplateDto: UpdateShippingRuleTemplateDto) {
    return this.shippingRuleTemplateService.update(+id, updateShippingRuleTemplateDto);
  }

  @Patch(':id/set-default')
  setDefault(@Param('id') id: string) {
    return this.shippingRuleTemplateService.setDefault(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
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