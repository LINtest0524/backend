import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MessageService } from './message.service';
import { HybridMessageService } from './hybrid-message.service';
import { MessageController, AdminMessageController } from './message.controller';
import { Message } from './message.entity';
import { SystemBroadcast } from './system-broadcast.entity';
import { PersonalMessage } from './personal-message.entity';
import { UserLoginLog } from './user-login-log.entity';
import { User } from '../user/user.entity';
import { AuditLog } from '../audit-log/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User, SystemBroadcast, PersonalMessage, UserLoginLog, AuditLog]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [MessageController, AdminMessageController],
  providers: [MessageService, HybridMessageService],
  exports: [MessageService, HybridMessageService],
})
export class MessageModule {}