import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CheckinDayReward } from './checkin-day-reward.entity';
import { CheckinProgress } from './checkin-progress.entity';
import { CheckinLedger } from './checkin-ledger.entity';

export enum ActivityType {
  STRICT_STREAK_7 = 'STRICT_STREAK_7',
  FLEX_CUMULATIVE = 'FLEX_CUMULATIVE',
  DAILY_CALENDAR = 'DAILY_CALENDAR',
}

@Entity('checkin_activity')
export class CheckinActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
    name: 'activity_type',
  })
  activityType: ActivityType;

  @Column({ type: 'int', nullable: true })
  days: number;

  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @Column({ type: 'date', name: 'end_date' })
  endDate: string;

  @Column({ type: 'timestamp', nullable: true, name: 'publish_at' })
  publishAt: Date;

  @Column({ type: 'boolean', default: false, name: 'is_enabled' })
  isEnabled: boolean;

  @Column({ type: 'int', nullable: true, name: 'company_id' })
  companyId: number;

  @Column({ type: 'jsonb', default: {}, name: 'config_json' })
  configJson: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CheckinDayReward, reward => reward.activity)
  dayRewards: CheckinDayReward[];

  @OneToMany(() => CheckinProgress, progress => progress.activity)
  progresses: CheckinProgress[];

  @OneToMany(() => CheckinLedger, ledger => ledger.activity)
  ledgers: CheckinLedger[];
}