import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { CommissionCondition } from './commission-condition.entity';
import { PlatformRefundRate } from './platform-refund-rate.entity';
import { FixedCost } from './fixed-cost.entity';

@Entity('condition_groups')
export class ConditionGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 門檻條件
  @Column({ type: 'int', default: 0 })
  minRegistrations: number;

  @Column({ type: 'int', default: 0 })
  minActiveMembers: number;

  @Column({ type: 'int', default: 0 })
  minValidBets: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  minNetRevenue: string;

  @Column({ type: 'boolean', default: false })
  requireNegativeProfit: boolean;

  // 結果設定
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  sharePercent: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  agentRemitPercent: string;

  // 排序（用於匹配順序）
  @Column({ type: 'int' })
  order: number;

  // 關聯主檔
  @ManyToOne(() => CommissionCondition, (condition) => condition.groups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'commission_condition_id' })
  commissionCondition: CommissionCondition;

  @Column({ name: 'commission_condition_id' })
  commissionConditionId: string;

  // 平台退水費率
  @OneToMany(() => PlatformRefundRate, (rate) => rate.conditionGroup, {
    cascade: true,
  })
  platformRefundRates: PlatformRefundRate[];

  // 固定費用
  @OneToOne(() => FixedCost, (cost) => cost.conditionGroup, {
    cascade: true,
    nullable: true,
  })
  fixedCost: FixedCost | null;
}