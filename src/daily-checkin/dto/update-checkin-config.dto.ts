import { PartialType } from '@nestjs/mapped-types';
import { CreateCheckinConfigDto } from './create-checkin-config.dto';

export class UpdateCheckinConfigDto extends PartialType(CreateCheckinConfigDto) {}