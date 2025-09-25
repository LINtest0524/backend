// src/identity-verification/identity-verification.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityVerification } from './identity-verification.entity';
import { IdentityVerificationService } from './identity-verification.service';
import { IdentityVerificationController } from './identity-verification.controller';
import { User } from '../user/user.entity';
import { NotificationModule } from '../notification/notification.module';
import { AutoTagRule } from '../auto-tag-rule/auto-tag-rule.entity';
import { AutoTagRuleService } from '../auto-tag-rule/auto-tag-rule.service';
import { UserTag } from '../user/user-tag.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IdentityVerification,
      User,
      AutoTagRule,
      UserTag,
    ]),
    NotificationModule,
  ],
  controllers: [IdentityVerificationController],
  providers: [IdentityVerificationService, AutoTagRuleService],
  exports: [IdentityVerificationService],
})
export class IdentityVerificationModule {}
