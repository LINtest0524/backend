import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFavorite } from './user-favorite.entity';
import { Product } from '../product/product.entity';
import { Article } from '../article/article.entity';
import { Promotion } from '../promotion/promotion.entity';

export interface FavoriteItemDto {
  id: number;
  name: string;
  price?: number;
  original_price?: number;
  thumbnail?: string;
  sku?: string;
  addedAt: string;
  hasVariants?: boolean;
  variantImages?: string[];
  itemType: string;
  itemId: number;
}

export interface AddFavoriteDto {
  itemType: 'product' | 'article' | 'promotion';
  itemId: number;
}

export interface SyncFavoritesDto {
  favorites: {
    itemType: string;
    itemId: number;
    addedAt: string;
  }[];
}

@Injectable()
export class UserFavoriteService {
  constructor(
    @InjectRepository(UserFavorite)
    private userFavoriteRepository: Repository<UserFavorite>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
  ) {}

  /**
   * 獲取用戶的所有收藏
   */
  async getUserFavorites(userId: number): Promise<FavoriteItemDto[]> {
    const favorites = await this.userFavoriteRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });

    const result: FavoriteItemDto[] = [];

    for (const favorite of favorites) {
      try {
        const item = await this.getItemData(favorite.itemType, favorite.itemId);
        if (item) {
          result.push({
            ...item,
            addedAt: favorite.createdAt.toISOString(),
            itemType: favorite.itemType,
            itemId: favorite.itemId
          });
        }
      } catch (error) {
        // 如果項目已被刪除，跳過該收藏
        console.warn(`Favorite item not found: ${favorite.itemType}:${favorite.itemId}`);
      }
    }

    return result;
  }

  /**
   * 添加收藏
   */
  async addFavorite(userId: number, dto: AddFavoriteDto): Promise<{ success: boolean; message: string }> {
    // 檢查項目是否存在
    const item = await this.getItemData(dto.itemType, dto.itemId);
    if (!item) {
      throw new NotFoundException(`${dto.itemType} not found`);
    }

    // 檢查是否已收藏
    const existing = await this.userFavoriteRepository.findOne({
      where: {
        userId,
        itemType: dto.itemType,
        itemId: dto.itemId
      }
    });

    if (existing) {
      return { success: false, message: '已在收藏清單中' };
    }

    // 創建收藏記錄
    const favorite = this.userFavoriteRepository.create({
      userId,
      itemType: dto.itemType,
      itemId: dto.itemId,
      snapshot: JSON.stringify(item) // 保存快照
    });

    await this.userFavoriteRepository.save(favorite);

    return { success: true, message: '加入收藏成功' };
  }

  /**
   * 移除收藏
   */
  async removeFavorite(userId: number, itemType: string, itemId: number): Promise<{ success: boolean; message: string }> {
    const result = await this.userFavoriteRepository.delete({
      userId,
      itemType,
      itemId
    });

    if (result.affected === 0) {
      return { success: false, message: '收藏項目不存在' };
    }

    return { success: true, message: '移除收藏成功' };
  }

  /**
   * 檢查是否已收藏
   */
  async isFavorite(userId: number, itemType: string, itemId: number): Promise<boolean> {
    const count = await this.userFavoriteRepository.count({
      where: { userId, itemType, itemId }
    });
    return count > 0;
  }

  /**
   * 清空用戶所有收藏
   */
  async clearAllFavorites(userId: number): Promise<{ success: boolean; message: string }> {
    await this.userFavoriteRepository.delete({ userId });
    return { success: true, message: '清空收藏成功' };
  }

  /**
   * 批量同步收藏（用於本地數據同步）
   */
  async syncFavorites(userId: number, dto: SyncFavoritesDto): Promise<{ success: boolean; message: string; synced: number }> {
    let syncedCount = 0;

    for (const favorite of dto.favorites) {
      try {
        // 檢查項目是否存在
        const item = await this.getItemData(favorite.itemType, favorite.itemId);
        if (!item) continue;

        // 檢查是否已存在
        const existing = await this.userFavoriteRepository.findOne({
          where: {
            userId,
            itemType: favorite.itemType,
            itemId: favorite.itemId
          }
        });

        if (!existing) {
          // 創建新收藏
          const newFavorite = this.userFavoriteRepository.create({
            userId,
            itemType: favorite.itemType,
            itemId: favorite.itemId,
            snapshot: JSON.stringify(item),
            createdAt: new Date(favorite.addedAt)
          });

          await this.userFavoriteRepository.save(newFavorite);
          syncedCount++;
        }
      } catch (error) {
        console.warn(`Failed to sync favorite: ${favorite.itemType}:${favorite.itemId}`, error);
      }
    }

    return { success: true, message: '同步完成', synced: syncedCount };
  }

  /**
   * 獲取用戶收藏統計
   */
  async getFavoriteStats(userId: number): Promise<{
    total: number;
    byType: Record<string, number>;
    recentCount: number; // 最近7天新增
  }> {
    const favorites = await this.userFavoriteRepository.find({
      where: { userId }
    });

    const total = favorites.length;
    const byType: Record<string, number> = {};
    
    // 最近7天
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    let recentCount = 0;

    favorites.forEach(favorite => {
      // 按類型統計
      byType[favorite.itemType] = (byType[favorite.itemType] || 0) + 1;
      
      // 最近7天統計
      if (favorite.createdAt >= sevenDaysAgo) {
        recentCount++;
      }
    });

    return { total, byType, recentCount };
  }

  /**
   * 根據類型和ID獲取項目數據
   */
  private async getItemData(itemType: string, itemId: number): Promise<any> {
    switch (itemType) {
      case 'product':
        const product = await this.productRepository.findOne({
          where: { id: itemId },
          relations: ['category', 'variants']
        });
        
        if (!product) return null;

        return {
          id: product.id,
          name: product.name,
          price: product.price,
          original_price: product.original_price,
          thumbnail: product.thumbnail,
          sku: product.sku,
          hasVariants: product.variants && product.variants.length > 0,
          variantImages: product.variants?.map(v => v.images).filter(Boolean).flat() || []
        };

      case 'article':
        const article = await this.articleRepository.findOne({
          where: { id: itemId }
        });
        
        if (!article) return null;

        return {
          id: article.id,
          name: article.title,
          thumbnail: article.image_url,
          sku: `ARTICLE-${article.id}`
        };

      case 'promotion':
        const promotion = await this.promotionRepository.findOne({
          where: { id: itemId }
        });
        
        if (!promotion) return null;

        return {
          id: promotion.id,
          name: promotion.title,
          thumbnail: promotion.imageUrl,
          sku: `PROMO-${promotion.id}`
        };

      default:
        throw new BadRequestException(`Unsupported item type: ${itemType}`);
    }
  }
}