import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFavoriteController } from './user-favorite.controller';
import { UserFavoriteService } from './user-favorite.service';
import { UserFavorite } from './user-favorite.entity';
import { Product } from '../product/product.entity';
import { Article } from '../article/article.entity';
import { Promotion } from '../promotion/promotion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserFavorite,
      Product,
      Article,
      Promotion
    ])
  ],
  controllers: [UserFavoriteController],
  providers: [UserFavoriteService],
  exports: [UserFavoriteService]
})
export class UserFavoriteModule {}