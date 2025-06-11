import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blacklist } from './blacklist.entity';
import { User } from '../user/user.entity';
import { BlacklistService } from './blacklist.service';
import { BlacklistController } from './blacklist.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Blacklist, User])],
  providers: [BlacklistService],
  controllers: [BlacklistController],
})
export class BlacklistModule {}
