import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';  // ✅ 這行重點

@Module({
  imports: [
    UserModule,  // ✅ 這裡把 UserModule 匯入進來
    TypeOrmModule.forFeature([]),  // (因為我們已經在 UserModule 裡註冊了 user 相關 entity)
    JwtModule.register({
      secret: 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
