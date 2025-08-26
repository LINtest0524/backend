import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../company/company.entity';
import { PromotionCategory } from '../promotion-category/promotion-category.entity';

@Entity('promotion')
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: number;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  content: string;

  @Column('text', { nullable: true })
  summary?: string;

  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl?: string;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate?: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 關聯
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => PromotionCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: PromotionCategory;

  // 計算屬性：活動狀態
  get status(): 'upcoming' | 'active' | 'expired' {
    const now = new Date();
    
    if (this.startDate && now < this.startDate) {
      return 'upcoming';
    }
    
    if (this.endDate && now > this.endDate) {
      return 'expired';
    }
    
    return 'active';
  }

  // 計算屬性：是否有效（活動中且啟用）
  get isValid(): boolean {
    return this.isActive && this.status !== 'expired';
  }
}