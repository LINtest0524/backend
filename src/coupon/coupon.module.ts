import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponTemplate } from './coupon-template.entity';
import { Coupon } from './coupon.entity';
import { CouponUsageLog } from './coupon-usage-log.entity';
import { User } from '../user/user.entity';
import { CouponService } from './coupon.service';
import { AdminCouponController, PortalCouponController } from './coupon.controller';
import { WalletTransactionModule } from '../wallet-transaction/wallet-transaction.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CouponTemplate,
      Coupon,
      CouponUsageLog,
      User,
    ]),
    WalletTransactionModule,
    AuditLogModule,
  ],
  controllers: [AdminCouponController, PortalCouponController],
  providers: [CouponService],
  exports: [CouponService],
})
export class CouponModule {}