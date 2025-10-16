import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../company/company.entity';

@Entity('daily_checkin_configs')
export class DailyCheckinConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column()
  day_number: number;

  @Column({ type: 'varchar', length: 20, default: 'points' })
  reward_type: string; // 'points', 'cash', 'coupon'

  @Column({ default: 0 })
  reward_value: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reward_description: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  activity_name: string; // 活動名稱，例如：中秋節簽到活動

  @Column({ type: 'timestamp', nullable: true })
  start_date: Date; // 活動開始時間

  @Column({ type: 'timestamp', nullable: true })
  end_date: Date; // 活動結束時間

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}