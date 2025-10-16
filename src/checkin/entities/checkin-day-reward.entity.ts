import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { CheckinActivity } from './checkin-activity.entity';

export enum RewardType {
  CASH = 'CASH',
  POINTS = 'POINTS',
  COUPON = 'COUPON',
  ITEM = 'ITEM',
}

@Entity('checkin_day_reward')
@Unique(['activityId', 'dayIndex'])
export class CheckinDayReward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'activity_id' })
  activityId: number;

  @Column({ type: 'int', name: 'day_index' })
  dayIndex: number;

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

  @ManyToOne(() => CheckinActivity, activity => activity.dayRewards, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'activityId' })
  activity: CheckinActivity;
}