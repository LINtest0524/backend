import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyCheckinController } from './daily-checkin.controller';
import { DailyCheckinService } from './daily-checkin.service';
import { DailyCheckinConfig } from './daily-checkin-config.entity';
import { UserDailyCheckin } from './user-daily-checkin.entity';
import { UserCheckinStatus } from './user-checkin-status.entity';
import { UserModule } from '../user/user.module';
// 新的實體和服務
import { DailyCheckinEvent } from './daily-checkin-event.entity';
import { DailyCheckinReward } from './daily-checkin-reward.entity';
import { DailyCheckinEventController } from './daily-checkin-event.controller';
import { DailyCheckinEventService } from './daily-checkin-event.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // 舊的實體（保留相容性）
      DailyCheckinConfig,
      UserDailyCheckin,
      UserCheckinStatus,
      // 新的實體
      DailyCheckinEvent,
      DailyCheckinReward,
    ]),
    UserModule,
  ],
  controllers: [
    DailyCheckinController, // 舊的控制器（保留相容性）
    DailyCheckinEventController, // 新的控制器
  ],
  providers: [
    DailyCheckinService, // 舊的服務（保留相容性）
    DailyCheckinEventService, // 新的服務
  ],
  exports: [
    DailyCheckinService,
    DailyCheckinEventService,
  ],
})
export class DailyCheckinModule {}