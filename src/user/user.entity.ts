import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'timestamp', nullable: true })
  first_login_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_login_at: Date | null;

  @Column({ type: 'varchar', nullable: true })
  last_login_platform: string | null;

  @Column({ type: 'varchar', nullable: true })
  last_login_ip: string | null;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
