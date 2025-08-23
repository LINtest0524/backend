import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Company } from '../company/company.entity';

@Entity('personal_message')
export class PersonalMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sender_id', nullable: true })
  senderId: number | null;

  @Column({ name: 'receiver_id' })
  receiverId: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  content: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'is_deleted_by_receiver', default: false })
  isDeletedByReceiver: boolean;

  @Column({ name: 'is_deleted_by_sender', default: false })
  isDeletedBySender: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  // 關聯
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}