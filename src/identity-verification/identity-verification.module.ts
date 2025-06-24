// src/identity-verification/identity-verification.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityVerification } from './identity-verification.entity';
import { IdentityVerificationService } from './identity-verification.service';
import { IdentityVerificationController } from './identity-verification.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IdentityVerification])],
  controllers: [IdentityVerificationController],
  providers: [IdentityVerificationService],
  exports: [IdentityVerificationService],
})
export class IdentityVerificationModule {}
