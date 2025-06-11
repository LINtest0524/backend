import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Blacklist } from './blacklist.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Blacklist])],
  exports: [TypeOrmModule],
})
export class BlacklistModule {}
