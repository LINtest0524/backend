import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PortalAuthController } from './portal-auth.controller';
import { PortalBannerController } from './portal-banner.controller';
import { PortalModuleController } from './portal-module.controller'; // ✅ 正確


import { UserModule } from '../user/user.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { BannerModule } from '../banner/banner.module';

import { Banner } from '../banner/banner.entity';
import { Company } from '../company/company.entity';
import { CompanyModule as CompanyModuleEntity } from '../company-module/company-module.entity'; // ✅ 模組設定 entity

@Module({
  imports: [
    ConfigModule,
    UserModule,
    AuditLogModule,
    BannerModule,
    TypeOrmModule.forFeature([
      Banner,
      Company,
      CompanyModuleEntity,
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
    PortalModuleController, // ✅ 別漏這行
  ],
})
export class PortalModule {}
