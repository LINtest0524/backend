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
import { Company } from '../company/company.entity';
import { UserTag } from './user-tag.entity';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',     //   超級管理員（系統開發者）
  GLOBAL_ADMIN = 'GLOBAL_ADMIN',   //   全域管理者（大老闆）
  AGENT_LEVEL_1 = 'AGENT_LEVEL_1', //   一級代理商
  AGENT_LEVEL_2 = 'AGENT_LEVEL_2', //   二級代理商
  AGENT_LEVEL_3 = 'AGENT_LEVEL_3', //   三級代理商
  AGENT_LEVEL_4 = 'AGENT_LEVEL_4', //   四級代理商
  AGENT_LEVEL_5 = 'AGENT_LEVEL_5', //   五級代理商
  AGENT_LEVEL_6 = 'AGENT_LEVEL_6', //   六級代理商
  AGENT_LEVEL_7 = 'AGENT_LEVEL_7', //   七級代理商
  AGENT_LEVEL_8 = 'AGENT_LEVEL_8', //   八級代理商
  AGENT_LEVEL_9 = 'AGENT_LEVEL_9', //   九級代理商
  AGENT_LEVEL_10 = 'AGENT_LEVEL_10', //   十級代理商
  AGENT_LEVEL_11 = 'AGENT_LEVEL_11', //   十一級代理商
  AGENT_LEVEL_12 = 'AGENT_LEVEL_12', //   十二級代理商
  AGENT_SUPPORT = 'AGENT_SUPPORT', //   客服人員
  USER = 'USER',                   //   一般會員
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  username: string;

  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  agent_name: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  user_code: string | null;

  @Column({ type: 'timestamp', nullable: true })
  first_login_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_login_at: Date | null;

  @Column({ type: 'varchar', nullable: true })
  last_login_platform: string | null;

  @Column({ type: 'varchar', nullable: true })
  last_login_ip: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  // 社交媒體聯絡方式
  @Column({ type: 'varchar', nullable: true })
  telegram: string | null;

  @Column({ type: 'varchar', nullable: true })
  line: string | null;

  @Column({ type: 'varchar', nullable: true })
  qq: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  // 代理前台子域名
  @Column({ type: 'varchar', length: 50, nullable: true })
  frontend_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  facebook_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  first_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  last_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  profile_picture: string | null;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: string;

  @Column({ type: 'boolean', default: false })
  is_blacklisted: boolean;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER }) //   加入角色
  role: UserRole;

  @Column({ type: 'timestamp', nullable: true }) //   軟刪除用欄位
  deleted_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ nullable: true })
  company_id: number;

  // 驗證相關欄位
  @Column({ type: 'boolean', default: false })
  id_verified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  id_verified_at: Date | null;

  @Column({ type: 'boolean', default: false })
  bank_verified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  bank_verified_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  vip_level: number;

  @Column({ type: 'integer', default: 0 })
  balance: number;

  @Column({ type: 'varchar', nullable: true })
  ip_whitelist: string | null;

  @Column({ type: 'varchar', nullable: true })
  department_type: string | null;

  // 代理商層級相關欄位
  @Column({ type: 'integer', nullable: true })
  agent_level: number | null; // 1=一級, 2=二級, 3=三級, 4=四級...12=十二級, null=會員/客服

  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  agent_code: string | null; // 代理商推廣代碼

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'parent_agent_id' })
  parent_agent: User | null; // 上級代理商

  @Column({ type: 'integer', nullable: true })
  parent_agent_id: number | null;

  // 占成條件關聯
  @Column({ type: 'varchar', nullable: true })
  commission_condition_id: string | null;

  // 代理商擴展欄位
  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string | null; // MALE 或 FEMALE

  @Column({ type: 'varchar', length: 20, nullable: true })
  id_number: string | null; // 身分證字號

  // 預設設定
  @Column({ type: 'varchar', length: 20, nullable: true, default: 'VIP0' })
  default_vip_level: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, default: 'daily' })
  default_rebate_settlement: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'regular' })
  default_payment_group: string | null;

  // 帳號狀態（JSON 陣列）
  @Column({ type: 'jsonb', nullable: true, default: '["normal"]' })
  account_status: string[] | null;

  // 銀行卡資料（JSON）
  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  bank_cards: any[] | null;

  // 禁止遊戲廠商（JSON）
  @Column({ type: 'jsonb', nullable: true })
  banned_game_providers: any | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by?: User;

  @OneToMany(() => UserTag, (userTag) => userTag.user)
  userTags: UserTag[];
}

