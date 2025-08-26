import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BlacklistModule } from './blacklist/blacklist.module';
import { PortalModule } from './portal/portal.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { BannerModule } from './banner/banner.module';
import { CompanyModuleModule } from './company-module/company-module.module';
import { ModuleModule } from './module/module.module';
import { MarqueeModule } from './marquee/marquee.module';
import { FloatingAdModule } from './floating-ad/floating-ad.module';
import { IdentityVerificationModule } from './identity-verification/identity-verification.module';
import { LoanProductModule } from './loan-product/loan-product.module';

import { LuckyPrizeModule } from './lucky-draw/lucky-prize.module';
import { CompanyModule } from './company/company.module';
import { MenuModule } from './menu/menu.module';
import { NewsModule } from './news/news.module';
import { ArticleModule } from './article/article.module';
import { ArticleCategoryModule } from './article-category/article-category.module';
import { LogoModule } from './logo/logo.module';
import { MarqueeTagModule } from './marquee-tag/marquee-tag.module';
import { PopupAnnouncementModule } from './popup-announcement/popup-announcement.module';
import { NotificationModule } from './notification/notification.module';
import { ProductModule } from './product/product.module'
import { OrderModule } from './order/order.module';
import { ProductCategoryModule } from './product-category/product-category.module';
import { EcpayModule } from './ecpay/ecpay.module';
import { ShippingRuleTemplateModule } from './shipping-rule-template/shipping-rule-template.module';
import { MessageModule } from './message/message.module';
import { PromotionModule } from './promotion/promotion.module';
import { PromotionCategoryModule } from './promotion-category/promotion-category.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    AuthModule,
    UserModule,
    BlacklistModule,
    PortalModule,
    AuditLogModule,
    BannerModule,
    CompanyModule,
    ModuleModule,
    MarqueeModule,
    FloatingAdModule,
    CompanyModuleModule, 
    IdentityVerificationModule,
    LoanProductModule,
    LuckyPrizeModule,
    MenuModule,
    NewsModule,
    ArticleModule,
    ArticleCategoryModule,
    LogoModule,
    MarqueeTagModule,
    PopupAnnouncementModule,
    NotificationModule,
    ProductModule,
    ProductCategoryModule,
    OrderModule,
    EcpayModule,
    ShippingRuleTemplateModule,
    MessageModule,
    PromotionModule,
    PromotionCategoryModule,

  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
