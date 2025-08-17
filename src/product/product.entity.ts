import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Company } from '../company/company.entity';
import { User } from '../user/user.entity';
import { ProductCategory } from '../product-category/product-category.entity';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  sku: string; // 商品編號

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  short_description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  original_price: number; // 原價（用於顯示折扣）

  @Column({ type: 'int', default: 0 })
  stock_quantity: number; // 庫存數量

  @Column({ type: 'int', default: 0 })
  min_stock: number; // 最低庫存警告

  @Column({ type: 'json', nullable: true })
  images: string[]; // 商品圖片陣列

  @Column({ type: 'varchar', nullable: true })
  thumbnail: string; // 縮圖


  @Column({ type: 'json', nullable: true })
  specifications: Record<string, any>; // 規格參數

  @Column({ type: 'text', nullable: true })
  specifications_description: string; // 規格說明

  @Column({ type: 'text', nullable: true })
  shipping_description: string; // 配送說明

  @Column({ type: 'json', nullable: true })
  tags: string[]; // 標籤

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
  status: ProductStatus;

  @Column({ type: 'int', default: 0 })
  sort_order: number; // 排序

  @Column({ type: 'boolean', default: false })
  is_featured: boolean; // 是否精選

  @Column({ type: 'boolean', default: true })
  is_visible: boolean; // 是否顯示

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 關聯
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'int' })
  company_id: number;

  @ManyToOne(() => ProductCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: ProductCategory;

  @Column({ type: 'int', nullable: true })
  category_id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by?: User;

  @Column({ type: 'int', nullable: true })
  created_by_id: number;
}