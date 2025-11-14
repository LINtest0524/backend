import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckinController } from './checkin.controller';
import { PublicCheckinController } from './public-checkin.controller';
import { CheckinService } from './checkin.service';
import { CheckinActivity } from './entities/checkin-activity.entity';
import { CheckinDayReward } from './entities/checkin-day-reward.entity';
import { CheckinProgress } from './entities/checkin-progress.entity';
import { CheckinLedger } from './entities/checkin-ledger.entity';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CheckinActivity,
      CheckinDayReward,
      CheckinProgress,
      CheckinLedger,
    ]),
    UserModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [CheckinController, PublicCheckinController],
  providers: [CheckinService],
  exports: [CheckinService],
})
export class CheckinModule {}