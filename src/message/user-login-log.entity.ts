import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../user/user.entity';
import { Company } from '../company/company.entity';

@Entity('user_login_log')
@Unique(['userId', 'companyId'])
export class UserLoginLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'last_login_at', default: () => 'CURRENT_TIMESTAMP' })
  lastLoginAt: Date;

  @Column({ name: 'last_broadcast_check_at', default: () => 'CURRENT_TIMESTAMP' })
  lastBroadcastCheckAt: Date;

  @Column({ name: 'deleted_broadcast_ids', type: 'text', default: '[]' })
  deletedBroadcastIds: string;

  @Column({ name: 'read_broadcast_ids', type: 'text', default: '[]' })
  readBroadcastIds: string;

  // 關聯
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}