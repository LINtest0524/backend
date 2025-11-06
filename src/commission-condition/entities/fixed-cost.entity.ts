import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ConditionGroup } from './condition-group.entity';

@Entity('fixed_costs')
export class FixedCost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  feeDeposit: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  feeWithdraw: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  refundBudgetPercent: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  promoBudgetPercent: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  bonusBudgetPercent: string;

  // 一對一關聯條件群組
  @OneToOne(() => ConditionGroup, (group) => group.fixedCost, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'condition_group_id' })
  conditionGroup: ConditionGroup;

  @Column({ name: 'condition_group_id', unique: true })
  conditionGroupId: string;
}