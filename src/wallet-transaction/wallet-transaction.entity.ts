import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'transaction_type', length: 50 })
  transactionType: string; // 'coupon_redeem', 'manual_recharge', 'admin_adjustment'

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, nullable: false })
  amount: number; // 金額（元，支援小數點後2位，正數為收入，負數為支出）

  @Column({ name: 'balance_before', type: 'numeric', precision: 12, scale: 2, default: 0, nullable: false })
  balanceBefore: number; // 交易前餘額（元）

  @Column({ name: 'balance_after', type: 'numeric', precision: 12, scale: 2, default: 0, nullable: false })
  balanceAfter: number; // 交易後餘額（元）

  @Column({ type: 'text' })
  description: string; // 交易描述

  @Column({ name: 'reference_id', length: 100, nullable: true })
  referenceId: string; // 關聯ID

  @Column({ name: 'reference_type', length: 50, nullable: true })
  referenceType: string; // 關聯類型

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string; // IP地址

  @Column({ name: 'created_by', nullable: true })
  createdBy: number; // 操作人員ID

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // 關聯到用戶
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}