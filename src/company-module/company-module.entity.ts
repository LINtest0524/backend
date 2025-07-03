import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '../company/company.entity';

@Entity('company_modules')
export class CompanyModule {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Company, { eager: true })
  @JoinColumn({ name: 'companyId' }) // 加這行對齊欄位名
  company: Company;

  @Column()
  companyId: number; // 加這行才有 foreign key 數字欄位可用

  @Column()
  module_key: string;

  @Column({ default: true })
  enabled: boolean;

  @Column('simple-array', { nullable: true })
  pages: string[];

  @Column('simple-array', { nullable: true })
  exclude_pages: string[];
}
