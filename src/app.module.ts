import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BlacklistModule } from './blacklist/blacklist.module';
import { PortalModule } from './portal/portal.module'
import { AuditLogModule } from './audit-log/audit-log.module';
import { BannerModule } from './banner/banner.module';


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
  ],
  controllers: [],
  providers: [], // ✅ 保持空陣列，不要註冊 APP_GUARD
})
export class AppModule {}
