import { PartialType } from '@nestjs/mapped-types';
import { CreatePromotionCategoryDto } from './create-promotion-category.dto';

export class UpdatePromotionCategoryDto extends PartialType(CreatePromotionCategoryDto) {}