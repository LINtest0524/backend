import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LuckyPrizeController } from './lucky-prize.controller';
import { LuckyPrizeService } from './lucky-prize.service';
import { LuckyPrize } from './lucky-prize.entity';
import { LuckyDrawRecord } from './lucky-draw-record.entity';
import { LuckyDrawEvent } from './lucky-draw-event.entity';
import { LuckyDrawEventController } from './lucky-draw-event.controller';
import { LuckyDrawEventService } from './lucky-draw-event.service';

@Module({
  imports: [TypeOrmModule.forFeature([LuckyPrize, LuckyDrawRecord, LuckyDrawEvent])],
  controllers: [LuckyPrizeController, LuckyDrawEventController],
  providers: [LuckyPrizeService, LuckyDrawEventService],
  exports: [LuckyPrizeService, LuckyDrawEventService], // 導出服務供其他模組使用
})
export class LuckyPrizeModule {}
