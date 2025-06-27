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
import { ModuleModule } from './module/module.module'
import { MarqueeModule } from './marquee/marquee.module'
import { IdentityVerificationModule } from './identity-verification/identity-verification.module';



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
    ModuleModule,
    MarqueeModule,
    CompanyModuleModule, // ✅ 新增模組註冊
    IdentityVerificationModule,

  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
