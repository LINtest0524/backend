import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Company } from '../company/company.entity';

@Entity('user_daily_checkins')
export class UserDailyCheckin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  company_id: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  checkin_date: Date;

  @Column()
  day_number: number; // 連續簽到第幾天

  @Column({ type: 'varchar', length: 20 })
  reward_type: string;

  @Column()
  reward_value: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reward_description: string;

  @Column({ default: true })
  is_received: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}