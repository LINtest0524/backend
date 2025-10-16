import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DailyCheckinEvent } from './daily-checkin-event.entity';

@Entity('daily_checkin_rewards')
export class DailyCheckinReward {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  event_id: number;

  @Column()
  day_number: number; // 第幾天

  @Column({ type: 'varchar', length: 20, default: 'points' })
  reward_type: string; // 'points', 'cash', 'coupon'

  @Column({ default: 0 })
  reward_value: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reward_description: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 關聯
  @ManyToOne(() => DailyCheckinEvent, event => event.rewards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: DailyCheckinEvent;
}