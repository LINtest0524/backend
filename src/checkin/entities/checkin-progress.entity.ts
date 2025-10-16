import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CheckinActivity } from './checkin-activity.entity';

@Entity('checkin_progress')
@Unique(['activityId', 'userId'])
export class CheckinProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'activity_id' })
  activityId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'date', nullable: true, name: 'last_checkin_date' })
  lastCheckinDate: string;

  @Column({ type: 'int', default: 0, name: 'current_streak' })
  currentStreak: number;

  @Column({ type: 'int', default: 0, name: 'total_checked' })
  totalChecked: number;

  @Column({ type: 'jsonb', default: {}, name: 'claimed_days_json' })
  claimedDaysJson: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CheckinActivity, activity => activity.progresses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'activityId' })
  activity: CheckinActivity;
}