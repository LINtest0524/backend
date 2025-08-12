import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../company/company.entity';
import { ArticleCategory } from '../article-category/article-category.entity';

export enum ArticleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  summary: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  image_url: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  publish_date: Date;

  @Column({ type: 'enum', enum: ArticleStatus, default: ArticleStatus.DRAFT })
  status: ArticleStatus;

  @Column({ type: 'integer', default: 0 })
  sort: number;

  @Column({ type: 'integer', default: 0 })
  view_count: number;

  @Column({ default: false })
  is_featured: boolean;

  @Column({ name: 'companyId' })
  companyId: number;

  @Column({ name: 'categoryId' })
  categoryId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ManyToOne(() => ArticleCategory)
  @JoinColumn({ name: 'categoryId' })
  category: ArticleCategory;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}