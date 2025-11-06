import { PartialType } from '@nestjs/mapped-types';
import { CreateCommissionConditionDto } from './create-commission-condition.dto';

export class UpdateCommissionConditionDto extends PartialType(
  CreateCommissionConditionDto,
) {}