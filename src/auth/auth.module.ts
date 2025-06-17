import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';

import { UserModule } from '../user/user.module';
import { CompanyModule } from '../company-module/company-module.entity';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'fallback_secret',
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
    UserModule,
    TypeOrmModule.forFeature([CompanyModule]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    //  JwtAuthGuard 不建議放這裡
  ],
  exports: [AuthService],
})
export class AuthModule {}
