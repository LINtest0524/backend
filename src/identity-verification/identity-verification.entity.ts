// src/identity-verification/identity-verification.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
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

  // ✅ 驗證類型：ID_CARD 或 BANK_ACCOUNT
  @Column({ type: 'enum', enum: ['ID_CARD', 'BANK_ACCOUNT'], default: 'ID_CARD' })
  type: 'ID_CARD' | 'BANK_ACCOUNT';

  // ✅ 身分證三張圖（只對 ID_CARD 有效）
  @Column({ type: 'varchar', nullable: true })
  frontImage: string | null;

  @Column({ type: 'varchar', nullable: true })
  backImage: string | null;

  @Column({ type: 'varchar', nullable: true })
  selfieImage: string | null;

  // ✅ 銀行帳戶封面圖（只對 BANK_ACCOUNT 有效）
  @Column({ type: 'varchar', nullable: true })
  accountImage: string | null;

  // ✅ 驗證狀態
  @Column({ type: 'varchar', default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
