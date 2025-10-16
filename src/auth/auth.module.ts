import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionService } from '../common/session.service';

import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { FacebookStrategy } from './facebook.strategy';
import { AuthController } from './auth.controller';

import { UserModule } from '../user/user.module';
import { User } from '../user/user.entity';
import { CompanyModule as CompanyModuleEntity } from '../company-module/company-module.entity'; //   改名避免與 Nest 的 Module 撞名
import { Blacklist } from '../blacklist/blacklist.entity';

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
        signOptions: { expiresIn: '7d' },
      }),
    }),
    UserModule,
    TypeOrmModule.forFeature([CompanyModuleEntity, User, Blacklist]), //   用改名後的 Entity
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    SessionService,
    {
      provide: FacebookStrategy,
      useClass: FacebookStrategy,
    },
  ],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
