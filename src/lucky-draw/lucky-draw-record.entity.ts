import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { LuckyPrize } from './lucky-prize.entity';
import { LuckyDrawEvent } from './lucky-draw-event.entity';

@Entity('lucky_draw_records')
export class LuckyDrawRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'prize_id' })
  prizeId: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'user_ip', nullable: true })
  userIp: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'prize_name', nullable: true })
  prizeName: string;

  @Column({ name: 'event_id', nullable: true })
  eventId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // 關聯
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => LuckyPrize)
  @JoinColumn({ name: 'prize_id' })
  prize: LuckyPrize;

  @ManyToOne(() => LuckyDrawEvent)
  @JoinColumn({ name: 'event_id' })
  event: LuckyDrawEvent;
}