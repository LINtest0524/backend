import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Tree,
  TreeParent,
  TreeChildren,
} from 'typeorm';
import { Company } from '../company/company.entity';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';

@Entity('product_category')
@Tree('closure-table')
export class ProductCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string; // URL 友善的名稱

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  image: string; // 分類圖片


  @Column({ type: 'int', default: 0 })
  sort_order: number; // 排序

  @Column({ type: 'boolean', default: true })
  is_active: boolean; // 是否啟用

  @Column({ type: 'boolean', default: true })
  is_visible: boolean; // 是否顯示

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 樹狀結構關聯
  @TreeParent()
  parent: ProductCategory;

  @TreeChildren()
  children: ProductCategory[];

  // 其他關聯
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'int' })
  company_id: number;

  @OneToMany(() => Product, product => product.category)
  products: Product[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  created_by?: User;

  @Column({ type: 'int', nullable: true })
  created_by_id: number;
}