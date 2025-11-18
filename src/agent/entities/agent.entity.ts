import { Company } from '../../company/company.entity';
import { User } from '../../user/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AgentStatus = 'active' | 'inactive' | 'pending';

@Entity('agents')
@Index(['loginAccount'], { unique: true })
export class Agent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Company, { nullable: false })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ name: 'agent_level', type: 'int' })
  agentLevel: number; // 1,2,3...

  @Column({ name: 'parent_agent_id', type: 'int', nullable: true })
  parentAgentId?: number | null;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  @Column({ name: 'phone', type: 'varchar', length: 50, nullable: true })
  phone?: string | null;

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: true })
  email?: string | null;

  @Column({ name: 'telegram', type: 'varchar', length: 100, nullable: true })
  telegram?: string | null;

  @Column({ name: 'line', type: 'varchar', length: 100, nullable: true })
  line?: string | null;

  @Column({ name: 'skype', type: 'varchar', length: 100, nullable: true })
  skype?: string | null;

  @Column({ name: 'qq', type: 'varchar', length: 100, nullable: true })
  qq?: string | null;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'active' })
  status: AgentStatus;

  @Column({ name: 'login_account', type: 'varchar', length: 64, unique: true })
  loginAccount: string;

  @Column({ name: 'password_hash', type: 'varchar' })
  passwordHash: string;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string | null;

  // 代理前台子域名（如：seo01），與company組合成完整URL
  @Column({ name: 'frontend_url', type: 'varchar', length: 50, nullable: true })
  frontendUrl?: string | null;

  // 預留：占成、返水（UI 先不啟用）
  @Column({ name: 'revenue_share', type: 'decimal', precision: 5, scale: 2, nullable: true })
  revenueShare?: string | null;

  @Column({ name: 'rebate_level', type: 'varchar', length: 32, nullable: true })
  rebateLevel?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}