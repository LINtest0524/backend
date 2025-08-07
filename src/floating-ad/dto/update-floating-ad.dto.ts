import { PartialType } from '@nestjs/mapped-types';
import { CreateFloatingAdDto } from './create-floating-ad.dto';

export class UpdateFloatingAdDto extends PartialType(CreateFloatingAdDto) {}