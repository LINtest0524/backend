import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

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

  @CreateDateColumn()
  created_at: Date;
}
