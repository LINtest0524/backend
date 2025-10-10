import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HybridMessageController } from './hybrid-message.controller';
import { HybridMessageService } from './hybrid-message.service';
import { SystemBroadcast } from './system-broadcast.entity';
import { PersonalMessage } from './personal-message.entity';
import { UserLoginLog } from './user-login-log.entity';
import { AuditLog } from '../audit-log/audit-log.entity';
import { User } from '../user/user.entity';
import { UserTag } from '../user/user-tag.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemBroadcast,
      PersonalMessage,
      UserLoginLog,
      AuditLog,
      User,
      UserTag
    ])
  ],
  controllers: [HybridMessageController],
  providers: [HybridMessageService],
  exports: [HybridMessageService] // 讓其他模組可以使用
})
export class HybridMessageModule {}