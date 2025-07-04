import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  action: string;

  @Column()
  ip: string;

  @Column()
  platform: string;

  @Column({ nullable: true })
  target?: string;

  @Column({ type: 'jsonb', nullable: true })
  before?: any;

  @Column({ type: 'jsonb', nullable: true })
  after?: any;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}
