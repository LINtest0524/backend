import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Coupon } from './coupon.entity';

@Entity('coupon_templates')
export class CouponTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 20 })
  type: 'PUBLIC' | 'BATCH' | 'CASH';

  @Column({ length: 20, name: 'discount_type' })
  discountType: 'PERCENTAGE' | 'FIXED' | 'CASH';

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_value' })
  discountValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'min_amount', default: 0 })
  minAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'max_discount', nullable: true })
  maxDiscount: number;

  @Column({ type: 'timestamp', name: 'valid_from' })
  validFrom: Date;

  @Column({ type: 'timestamp', name: 'valid_to' })
  validTo: Date;

  @Column({ name: 'usage_limit', nullable: true })
  usageLimit: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Coupon, coupon => coupon.template)
  coupons: Coupon[];
}