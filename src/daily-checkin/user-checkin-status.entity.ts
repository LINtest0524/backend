import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Company } from '../company/company.entity';

@Entity('user_checkin_status')
export class UserCheckinStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  company_id: number;

  @Column({ default: 0 })
  consecutive_days: number; // 連續簽到天數

  @Column({ type: 'date', nullable: true })
  last_checkin_date: Date; // 最後簽到日期

  @Column({ default: 0 })
  total_checkins: number; // 總簽到次數

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}