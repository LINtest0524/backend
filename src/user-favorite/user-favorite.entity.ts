import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index, Unique } from 'typeorm';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';

@Entity('user_favorites')
@Unique(['userId', 'itemType', 'itemId'])
@Index(['userId', 'createdAt'])
@Index(['itemType', 'itemId'])
export class UserFavorite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'item_type', length: 50, comment: '項目類型：product, article, promotion' })
  itemType: string;

  @Column({ name: 'item_id', comment: '項目ID' })
  itemId: number;

  @Column({ type: 'text', nullable: true, comment: '收藏時的快照數據（JSON）' })
  snapshot: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  // 關聯
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // 由於支援多種類型，這裡不直接關聯 Product
  // 而是在 Service 層動態處理
}