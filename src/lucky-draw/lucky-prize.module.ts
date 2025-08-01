import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LuckyPrizeController } from './lucky-prize.controller';
import { LuckyPrizeService } from './lucky-prize.service';
import { LuckyPrize } from './lucky-prize.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LuckyPrize])],
  controllers: [LuckyPrizeController],
  providers: [LuckyPrizeService],
})
export class LuckyPrizeModule {}
