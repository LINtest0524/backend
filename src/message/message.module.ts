import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MessageService } from './message.service';
import { MessageController, AdminMessageController } from './message.controller';
import { Message } from './message.entity';
import { User } from '../user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [MessageController, AdminMessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}