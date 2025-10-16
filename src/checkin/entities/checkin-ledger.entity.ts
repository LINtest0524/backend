import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { CheckinActivity } from './checkin-activity.entity';
import { RewardType } from './checkin-day-reward.entity';

@Entity('checkin_ledger')
@Index(['userId', 'activityId', 'dayIndex'], { unique: true, where: 'day_index IS NOT NULL' })
@Index(['userId', 'activityId', 'tierDaysRequired'], { unique: true, where: 'tier_days_required IS NOT NULL' })
export class CheckinLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'activity_id' })
  activityId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({
    type: 'enum',
    enum: RewardType,
    name: 'reward_type',
  })
  rewardType: RewardType;

  @Column({ type: 'int', nullable: true })
  amount: number;

  @Column({ type: 'jsonb', default: {}, name: 'meta_json' })
  metaJson: any;

  @Column({ type: 'int', nullable: true, name: 'day_index' })
  dayIndex: number;

  @Column({ type: 'int', nullable: true, name: 'tier_days_required' })
  tierDaysRequired: number;

  @CreateDateColumn({ name: 'issued_at' })
  issuedAt: Date;

  @ManyToOne(() => CheckinActivity, activity => activity.ledgers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'activityId' })
  activity: CheckinActivity;
}