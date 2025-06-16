import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm'; // ✅ 加這行
import { PortalAuthController } from './portal-auth.controller';
import { PortalBannerController } from './portal-banner.controller';
import { UserModule } from '../user/user.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { Banner } from '../banner/banner.entity'; // ✅ 引入 Entity
import { Company } from '../company/company.entity'; // ✅ 引入 Entity
import { BannerModule } from '../banner/banner.module';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    AuditLogModule,
    BannerModule,
    TypeOrmModule.forFeature([Banner, Company]), // ✅ 加入這行
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
  ],
})
export class PortalModule {}
