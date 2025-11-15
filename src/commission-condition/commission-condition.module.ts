import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionConditionService } from './commission-condition.service';
import { CommissionConditionController } from './commission-condition.controller';
import { CommissionCondition } from './entities/commission-condition.entity';
import { ConditionGroup } from './entities/condition-group.entity';
import { PlatformRefundRate } from './entities/platform-refund-rate.entity';
import { FixedCost } from './entities/fixed-cost.entity';
import { User } from '../user/user.entity';
import { Company } from '../company/company.entity';
import { AgentModule } from '../agent/agent.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommissionCondition,
      ConditionGroup,
      PlatformRefundRate,
      FixedCost,
      User,
      Company,
    ]),
    AgentModule,
    AuditLogModule,
  ],
  controllers: [CommissionConditionController],
  providers: [CommissionConditionService],
  exports: [CommissionConditionService],
})
export class CommissionConditionModule {}