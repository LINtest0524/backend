import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '../company/company.entity';

export enum BannerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  desktop_image_url: string;

  @Column()
  mobile_image_url: string;

  @Column({ type: 'timestamp' })
  start_time: Date;

  @Column({ type: 'timestamp' })
  end_time: Date;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'enum', enum: BannerStatus, default: BannerStatus.INACTIVE })
  status: BannerStatus;

  @Column({ name: 'companyId' }) 
  companyId: number; // ✅ 新增欄位

  @ManyToOne(() => Company, company => company.banners)
  @JoinColumn({ name: 'companyId' }) // ✅ 明確關聯欄位
  company: Company;
}
