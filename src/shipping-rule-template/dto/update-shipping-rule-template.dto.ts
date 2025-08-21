import { PartialType } from '@nestjs/mapped-types';
import { CreateShippingRuleTemplateDto } from './create-shipping-rule-template.dto';

export class UpdateShippingRuleTemplateDto extends PartialType(CreateShippingRuleTemplateDto) {}