import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { LuckyDrawEvent } from './lucky-draw-event.entity';

@Entity('lucky_prize')
export class LuckyPrize {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl: string;

  @Column()
  quantity: number;

  @Column('numeric', { precision: 5, scale: 2 })
  probability: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ name: 'event_id', nullable: true })
  eventId: number;

  @ManyToOne(() => LuckyDrawEvent, event => event.prizes)
  @JoinColumn({ name: 'event_id' })
  event: LuckyDrawEvent;
}
