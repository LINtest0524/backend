import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Company } from '../../company/company.entity';
import { User } from '../../user/user.entity';
import { ConditionGroup } from './condition-group.entity';
import { CommissionMethod } from '../enums/commission-method.enum';

@Entity('commission_conditions')
export class CommissionCondition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: CommissionMethod })
  method: CommissionMethod;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // 新增欄位：代理制度類型
  @Column({ type: 'varchar', length: 20, nullable: true })
  systemType: string;

  // 新增欄位：代理級別
  @Column({ type: 'varchar', length: 20, nullable: true })
  agentLevel: string;

  // 新增欄位：代理占成比例
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionPercent: number;

  // 新增欄位：遊戲返水比例 (JSON格式)
  @Column({ type: 'json', nullable: true })
  gameRebateRates: Record<string, number>;

  // 新增欄位：結算週期
  @Column({ type: 'varchar', length: 20, nullable: true })
  settlementCycle: string;

  @Column({ type: 'date', nullable: true })
  effectiveFrom: Date | null;

  @Column({ type: 'date', nullable: true })
  effectiveTo: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 關聯公司
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'company_id' })
  companyId: number;

  // 關聯代理商（可選，agentId=0 表示任意代理商）
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: User | null;

  @Column({ name: 'agent_id', nullable: true, default: 0 })
  agentId: number;

  // 條件群組
  @OneToMany(() => ConditionGroup, (group) => group.commissionCondition, {
    cascade: true,
  })
  groups: ConditionGroup[];
}