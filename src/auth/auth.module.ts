import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';

import { UserModule } from '../user/user.module';
import { CompanyModule as CompanyModuleEntity } from '../company-module/company-module.entity'; // ✅ 改名避免與 Nest 的 Module 撞名

import { AuditLogModule } from '../audit-log/audit-log.module';


@Module({
  imports: [
    AuditLogModule,
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'fallback_secret',
        signOptions: { expiresIn: '1d' },
      }),
    }),
    UserModule,
    TypeOrmModule.forFeature([CompanyModuleEntity]), // ✅ 用改名後的 Entity
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
