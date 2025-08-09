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

  @Column({ type: 'json', nullable: true })
  before?: any;

  @Column({ type: 'json', nullable: true })
  after?: any;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: number;
}
