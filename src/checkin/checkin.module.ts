import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckinController } from './checkin.controller';
import { PublicCheckinController } from './public-checkin.controller';
import { CheckinService } from './checkin.service';
import { CheckinActivity } from './entities/checkin-activity.entity';
import { CheckinDayReward } from './entities/checkin-day-reward.entity';
import { CheckinProgress } from './entities/checkin-progress.entity';
import { CheckinLedger } from './entities/checkin-ledger.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CheckinActivity,
      CheckinDayReward,
      CheckinProgress,
      CheckinLedger,
    ]),
    UserModule,
  ],
  controllers: [CheckinController, PublicCheckinController],
  providers: [CheckinService],
  exports: [CheckinService],
})
export class CheckinModule {}