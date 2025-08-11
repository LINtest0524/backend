import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { FacebookStrategy } from './facebook.strategy';
import { AuthController } from './auth.controller';

import { UserModule } from '../user/user.module';
import { User } from '../user/user.entity';
import { CompanyModule as CompanyModuleEntity } from '../company-module/company-module.entity'; //   改名避免與 Nest 的 Module 撞名

import { AuditLogModule } from '../audit-log/audit-log.module';

console.log('AuthModule 被加載，FacebookStrategy 將被註冊');

// 強制載入 FacebookStrategy
import('./facebook.strategy').then(() => {
  console.log('FacebookStrategy 模組已強制載入');
}).catch(err => {
  console.error('    FacebookStrategy 模組載入失敗:', err);
});

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
    TypeOrmModule.forFeature([CompanyModuleEntity, User]), //   用改名後的 Entity
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: FacebookStrategy,
      useClass: FacebookStrategy,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
