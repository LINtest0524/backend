// src/identity-verification/identity-verification.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity('identity_verification')
export class IdentityVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar' })
  frontImage: string;

  @Column({ type: 'varchar' })
  backImage: string;

  @Column({ type: 'varchar' })
  selfieImage: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'varchar', nullable: true }) // ✅ 新增這行
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
} 
