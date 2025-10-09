import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { CouponTemplate } from './coupon-template.entity';
import { CouponUsageLog } from './coupon-usage-log.entity';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_id' })
  templateId: number;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ name: 'assigned_user_id', type: 'integer', nullable: true })
  assignedUserId: number | null;

  @Column({ name: 'is_used', default: false })
  isUsed: boolean;

  @Column({ name: 'used_by', type: 'integer', nullable: true })
  usedBy: number | null;

  @Column({ type: 'timestamp', name: 'used_at', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CouponTemplate, template => template.coupons)
  @JoinColumn({ name: 'template_id' })
  template: CouponTemplate;

  @OneToMany(() => CouponUsageLog, usageLog => usageLog.coupon)
  usageLogs: CouponUsageLog[];
}