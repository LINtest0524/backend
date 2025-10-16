import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../company/company.entity';
import { DailyCheckinReward } from './daily-checkin-reward.entity';

@Entity('daily_checkin_events')
export class DailyCheckinEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string; // 活動名稱

  @Column({ type: 'text', nullable: true })
  description: string; // 活動描述

  @Column({ type: 'timestamp' })
  start_date: Date; // 活動開始時間

  @Column({ type: 'timestamp' })
  end_date: Date; // 活動結束時間

  @Column({ default: 7 })
  total_days: number; // 總簽到天數

  @Column({ default: true })
  is_active: boolean; // 是否啟用

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 關聯
  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => DailyCheckinReward, reward => reward.event)
  rewards: DailyCheckinReward[];
}