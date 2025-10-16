import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('maintenance')
export class Maintenance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'is_enabled', default: false })
  isEnabled: boolean;

  @Column({ name: 'title', length: 255, default: '系統維護中' })
  title: string;

  @Column({ name: 'message', type: 'text', nullable: true })
  message: string;

  @Column({ name: 'estimated_end_time', type: 'timestamp', nullable: true })
  estimatedEndTime: Date;

  @Column({ name: 'contact_info', type: 'text', nullable: true })
  contactInfo: string;

  @Column({ name: 'background_color', length: 7, default: '#1f2937' })
  backgroundColor: string;

  @Column({ name: 'text_color', length: 7, default: '#ffffff' })
  textColor: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}