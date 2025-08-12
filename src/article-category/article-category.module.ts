import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleCategoryService } from './article-category.service';
import { ArticleCategoryController } from './article-category.controller';
import { ArticleCategory } from './article-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ArticleCategory])],
  controllers: [ArticleCategoryController],
  providers: [ArticleCategoryService],
  exports: [ArticleCategoryService],
})
export class ArticleCategoryModule {}