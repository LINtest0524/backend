import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '../company/company.entity';
import { User } from '../user/user.entity';

export enum ProductType {
  A = 'A',
  B = 'B',
  C = 'C',
}

export enum InterestRule {
  DEDUCT_FIRST = '先扣',
  DEDUCT_LATER = '後扣',
  DEDUCT_PROPORTIONAL = '按比例扣',
}

@Entity('loan_product')
export class LoanProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ProductType, default: ProductType.A })
  product_type: ProductType;

  @Column({ type: 'varchar' })
  product_name: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  first_amount: number | null;

  @Column({ type: 'int', nullable: true })
  credit_period: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  open_rate: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  setup_fee: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  charge_rate: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weekly_profit: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  morning_rate: number | null;

  @Column({ type: 'int', nullable: true })
  extension_days: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  max_advance_count: number | null;

  @Column({ type: 'varchar', nullable: true })
  advance_rule: string | null;

  @Column({ type: 'int', nullable: true })
  installment_period: number | null;

  @Column({ type: 'int', nullable: true })
  min_period: number | null;

  @Column({ type: 'int', nullable: true })
  max_period: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  daily_profit: number | null;

  @Column({ type: 'enum', enum: InterestRule, default: InterestRule.DEDUCT_FIRST })
  interest_rule: InterestRule;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'int' })
  company_id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by?: User;


  @Column({ nullable: true })
  product_code: string;


}
