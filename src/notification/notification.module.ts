import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { IdentityVerification } from '../identity-verification/identity-verification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([IdentityVerification]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback_secret',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}