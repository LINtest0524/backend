import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Coupon } from './coupon.entity';

@Entity('coupon_usage_logs')
export class CouponUsageLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'coupon_id' })
  couponId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'order_id', type: 'integer', nullable: true })
  orderId: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_amount' })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'original_amount' })
  originalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'final_amount' })
  finalAmount: number;

  @CreateDateColumn({ name: 'used_at' })
  usedAt: Date;

  @ManyToOne(() => Coupon, coupon => coupon.usageLogs)
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;
}