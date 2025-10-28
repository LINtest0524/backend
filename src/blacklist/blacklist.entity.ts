import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../company/company.entity';

@Entity()
export class Blacklist {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId?: number;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  ip?: string;

  @Column({ type: 'varchar', nullable: true })
  reason?: string;

  @Column({ nullable: true })
  company_id: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @CreateDateColumn()
  created_at: Date;
}
