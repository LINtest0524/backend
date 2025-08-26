import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionCategoryService } from './promotion-category.service';
import { PromotionCategoryController } from './promotion-category.controller';
import { PromotionCategory } from './promotion-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PromotionCategory])],
  controllers: [PromotionCategoryController],
  providers: [PromotionCategoryService],
  exports: [PromotionCategoryService],
})
export class PromotionCategoryModule {}