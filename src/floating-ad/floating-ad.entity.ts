import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '../company/company.entity';

export enum FloatingAdStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum FloatingAdPosition {
  BOTTOM_RIGHT = 'bottom-right',
  BOTTOM_LEFT = 'bottom-left',
  TOP_RIGHT = 'top-right',
  TOP_LEFT = 'top-left',
}

@Entity('floating_ads')
export class FloatingAd {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  link_url: string;

  @Column({ nullable: true })
  image_url: string;

  @Column({ default: true })
  target_blank: boolean;

  @Column({ 
    type: 'enum', 
    enum: FloatingAdPosition, 
    default: FloatingAdPosition.BOTTOM_RIGHT 
  })
  position: FloatingAdPosition;

  @Column({ 
    type: 'enum', 
    enum: FloatingAdStatus, 
    default: FloatingAdStatus.INACTIVE 
  })
  status: FloatingAdStatus;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ name: 'companyId' })
  companyId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}