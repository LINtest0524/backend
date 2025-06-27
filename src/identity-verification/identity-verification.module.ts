// src/identity-verification/identity-verification.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityVerification } from './identity-verification.entity';
import { IdentityVerificationService } from './identity-verification.service';
import { IdentityVerificationController } from './identity-verification.controller';
import { User } from '../user/user.entity'; // ✅ 要加這行

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IdentityVerification,
      User, // ✅ 補上這行
    ]),
  ],
  controllers: [IdentityVerificationController],
  providers: [IdentityVerificationService],
  exports: [IdentityVerificationService],
})
export class IdentityVerificationModule {}
