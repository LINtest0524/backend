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