import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Company } from '../company/company.entity';

@Entity('system_broadcast')
export class SystemBroadcast {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'sender_id', nullable: true })
  senderId: number | null;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  content: string;

  @Column({ 
    name: 'broadcast_type', 
    default: 'GENERAL',
    type: 'varchar',
    length: 50
  })
  broadcastType: 'GENERAL' | 'IMPORTANT' | 'MAINTENANCE' | 'NEW_MEMBER';

  @Column({ 
    name: 'target_audience', 
    default: 'ALL',
    type: 'varchar',
    length: 50
  })
  targetAudience: 'ALL' | 'VIP' | 'NEW_USERS';

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'send_to_new_members', default: false })
  sendToNewMembers: boolean;

  @Column({ name: 'valid_days', type: 'int', nullable: true })
  validDays: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 關聯
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}