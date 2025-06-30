import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Company } from '../company/company.entity';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',     // ✅ 最高權限（你自己）
  GLOBAL_ADMIN = 'GLOBAL_ADMIN',   // ✅ 全站管理者（次高權限）
  AGENT_OWNER = 'AGENT_OWNER',     // ✅ 代理商老闆
  AGENT_SUPPORT = 'AGENT_SUPPORT', // ✅ 代理商客服
  USER = 'USER',                   // ✅ 一般會員
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  username: string;

  @Column({ type: 'varchar' })
  password: string;

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

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: string;

  @Column({ type: 'boolean', default: false })
  is_blacklisted: boolean;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER }) // ✅ 加入角色
  role: UserRole;

  @Column({ type: 'timestamp', nullable: true }) // ✅ 軟刪除用欄位
  deleted_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Company)
  company: Company;
}
