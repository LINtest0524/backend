import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

export enum ProductVariantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  product_id: number;

  @Column({ type: 'varchar', length: 100 })
  variant_name: string; // 變體名稱，如：紅色-大號

  @Column({ type: 'varchar', length: 50, unique: true })
  sku: string; // 獨立的SKU

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // 變體價格

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  original_price: number; // 變體原價

  @Column({ type: 'int', default: 0 })
  stock_quantity: number; // 變體庫存

  @Column({ type: 'int', default: 0 })
  min_stock: number; // 最低庫存警告

  @Column({ type: 'json', nullable: true })
  variant_options: Record<string, string>; // 規格選項 {"color": "紅色", "size": "大號"}

  @Column({ type: 'json', nullable: true })
  images: string[]; // 變體專屬圖片

  @Column({ type: 'boolean', default: false })
  is_default: boolean; // 是否為預設變體

  @Column({ type: 'enum', enum: ProductVariantStatus, default: ProductVariantStatus.ACTIVE })
  status: ProductVariantStatus;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 關聯
  @ManyToOne(() => Product, product => product.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}