import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MessageService } from './message.service';
import { HybridMessageService } from './hybrid-message.service';
import { MessageController, AdminMessageController } from './message.controller';
import { MarqueeTagService } from '../marquee-tag/marquee-tag.service';
import { Message } from './message.entity';
import { SystemBroadcast } from './system-broadcast.entity';
import { PersonalMessage } from './personal-message.entity';
import { UserLoginLog } from './user-login-log.entity';
import { User } from '../user/user.entity';
import { UserTag } from '../user/user-tag.entity';
import { MarqueeTag } from '../marquee-tag/marquee-tag.entity';
import { AuditLog } from '../audit-log/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User, UserTag, SystemBroadcast, PersonalMessage, UserLoginLog, AuditLog, MarqueeTag]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [MessageController, AdminMessageController],
  providers: [MessageService, HybridMessageService, MarqueeTagService],
  exports: [MessageService, HybridMessageService],
})
export class MessageModule {}