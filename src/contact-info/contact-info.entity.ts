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

@Entity('contact_infos')
export class ContactInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 500, nullable: true })
  icon: string;

  @Column({ length: 1000, nullable: true })
  link: string;

  @Column({ name: 'target_blank', default: false })
  targetBlank: boolean;

  @Column({ name: 'qr_code', length: 500, nullable: true })
  qrCode: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 關聯
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}