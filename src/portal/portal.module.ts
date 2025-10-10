import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PortalAuthController } from './portal-auth.controller';
import { PortalBannerController } from './portal-banner.controller';
import { PortalModuleController } from './portal-module.controller'; //   正確
import { PortalFloatingAdController } from './portal-floating-ad.controller';
import { PortalMenuController } from './portal-menu.controller';
import { PortalNewsController } from './portal-news.controller';
import { PortalArticleController } from './portal-article.controller';
import { PortalLogoController } from './portal-logo.controller';
import { PortalPopupAnnouncementController } from './portal-popup-announcement.controller';
import { PortalProductController } from './portal-product.controller'
import { PortalOrderController } from './portal-order.controller';
import { PortalShippingController } from './portal-shipping.controller';
import { PortalPromotionController } from './portal-promotion.controller';
import { PortalMessageController } from './portal-message.controller';


import { UserModule } from '../user/user.module';
import { OrderModule } from '../order/order.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { BannerModule } from '../banner/banner.module';
import { MarqueeModule } from '../marquee/marquee.module';
import { FloatingAdModule } from '../floating-ad/floating-ad.module';
import { MenuModule } from '../menu/menu.module';
import { NewsModule } from '../news/news.module';
import { ArticleModule } from '../article/article.module';
import { ArticleCategoryModule } from '../article-category/article-category.module';
import { LogoModule } from '../logo/logo.module';
import { PopupAnnouncementModule } from '../popup-announcement/popup-announcement.module';
import { ProductModule } from '../product/product.module';
import { ProductCategoryModule } from '../product-category/product-category.module';
import { CompanyModule } from '../company/company.module';
import { MessageModule } from '../message/message.module';
import { PromotionModule } from '../promotion/promotion.module';
import { PromotionCategoryModule } from '../promotion-category/promotion-category.module';

import { Banner } from '../banner/banner.entity';
import { Company } from '../company/company.entity';
import { CompanyModule as CompanyModuleEntity } from '../company-module/company-module.entity'; //   模組設定 entity
import { FloatingAd } from '../floating-ad/floating-ad.entity';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    AuditLogModule,
    BannerModule,
    MarqueeModule,
    FloatingAdModule,
    MenuModule,
    NewsModule,
    ArticleModule,
    ArticleCategoryModule,
    LogoModule,
    PopupAnnouncementModule,
    ProductModule,
    ProductCategoryModule,
    CompanyModule,
    MessageModule,
    PromotionModule,
    PromotionCategoryModule,
    OrderModule,
    TypeOrmModule.forFeature([
      Banner,
      Company,
      CompanyModuleEntity,
      FloatingAd,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [
    PortalAuthController,
    PortalBannerController,
    PortalModuleController, //   別漏這行
    PortalFloatingAdController,
    PortalMenuController,
    PortalNewsController,
    PortalArticleController,
    PortalLogoController,
    PortalPopupAnnouncementController,
    PortalProductController,
    PortalOrderController,
    PortalShippingController,
    PortalPromotionController,
    PortalMessageController,
  ],
})
export class PortalModule {}
