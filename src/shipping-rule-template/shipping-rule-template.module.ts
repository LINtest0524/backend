import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingRuleTemplateService } from './shipping-rule-template.service';
import { ShippingRuleTemplateController, PortalShippingRuleTemplateController } from './shipping-rule-template.controller';
import { ShippingRuleTemplate } from './shipping-rule-template.entity';
import { ShippingRuleTemplateItem } from './shipping-rule-template-item.entity';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShippingRuleTemplate, ShippingRuleTemplateItem]),
    CompanyModule
  ],
  controllers: [ShippingRuleTemplateController, PortalShippingRuleTemplateController],
  providers: [ShippingRuleTemplateService],
  exports: [ShippingRuleTemplateService],
})
export class ShippingRuleTemplateModule {}