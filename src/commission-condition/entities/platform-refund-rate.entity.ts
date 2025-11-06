import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ConditionGroup } from './condition-group.entity';

@Entity('platform_refund_rates')
export class PlatformRefundRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  platformCode: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  refundPercent: string;

  // 關聯條件群組
  @ManyToOne(() => ConditionGroup, (group) => group.platformRefundRates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'condition_group_id' })
  conditionGroup: ConditionGroup;

  @Column({ name: 'condition_group_id' })
  conditionGroupId: string;
}