import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './promotion.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

export interface PromotionQueryOptions {
  page?: number;
  limit?: number;
  categoryId?: number;
  isActive?: boolean;
  status?: 'upcoming' | 'active' | 'expired';
  title?: string;
  createdFrom?: string;
  createdTo?: string;
}

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
  ) {}

  async create(companyId: number, createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    const promotionData: Partial<Promotion> = {
      ...createPromotionDto,
      companyId,
      startDate: createPromotionDto.startDate ? new Date(createPromotionDto.startDate) : undefined,
      endDate: createPromotionDto.endDate ? new Date(createPromotionDto.endDate) : undefined,
    };

    return await this.promotionRepository.save(promotionData as Promotion);
  }

  async findAll(companyId: number, options: PromotionQueryOptions = {}): Promise<{
    promotions: Promotion[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, categoryId, isActive, status, title, createdFrom, createdTo } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.promotionRepository
      .createQueryBuilder('promotion')
      .leftJoinAndSelect('promotion.category', 'category')
      .where('promotion.companyId = :companyId', { companyId });

    if (categoryId) {
      queryBuilder.andWhere('promotion.categoryId = :categoryId', { categoryId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('promotion.isActive = :isActive', { isActive });
    }

    // 標題篩選
    if (title) {
      queryBuilder.andWhere('promotion.title ILIKE :title', { title: `%${title}%` });
    }

    // 建立時間篩選
    if (createdFrom) {
      queryBuilder.andWhere('promotion.createdAt >= :createdFrom', { 
        createdFrom: new Date(createdFrom + ' 00:00:00') 
      });
    }

    if (createdTo) {
      queryBuilder.andWhere('promotion.createdAt <= :createdTo', { 
        createdTo: new Date(createdTo + ' 23:59:59') 
      });
    }

    // 根據狀態篩選
    if (status) {
      const now = new Date();
      switch (status) {
        case 'upcoming':
          queryBuilder.andWhere('promotion.startDate > :now', { now });
          break;
        case 'active':
          queryBuilder.andWhere(
            '(promotion.startDate IS NULL OR promotion.startDate <= :now) AND (promotion.endDate IS NULL OR promotion.endDate > :now)',
            { now }
          );
          break;
        case 'expired':
          queryBuilder.andWhere('promotion.endDate <= :now', { now });
          break;
      }
    }

    const [promotions, total] = await queryBuilder
      .orderBy('promotion.sortOrder', 'ASC')
      .addOrderBy('promotion.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      promotions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllActive(companyId: number, options: PromotionQueryOptions = {}): Promise<{
    promotions: Promotion[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.findAll(companyId, { ...options, isActive: true });
  }

  async findOne(id: number, companyId: number): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({
      where: { id, companyId },
      relations: ['category'],
    });

    if (!promotion) {
      throw new NotFoundException(`優惠活動 ID ${id} 不存在`);
    }

    return promotion;
  }

  async findBySlug(id: number, companyId: number, incrementView = false): Promise<Promotion> {
    const promotion = await this.findOne(id, companyId);

    if (incrementView) {
      await this.incrementViewCount(id);
    }

    return promotion;
  }

  async update(id: number, companyId: number, updatePromotionDto: UpdatePromotionDto): Promise<Promotion> {
    const promotion = await this.findOne(id, companyId);

    const updateData: Partial<Promotion> = {
      ...updatePromotionDto,
      startDate: updatePromotionDto.startDate ? new Date(updatePromotionDto.startDate) : promotion.startDate,
      endDate: updatePromotionDto.endDate ? new Date(updatePromotionDto.endDate) : promotion.endDate,
    };

    // 如果傳入空字串，設為 undefined
    if (updateData.startDate === null) updateData.startDate = undefined;
    if (updateData.endDate === null) updateData.endDate = undefined;

    Object.assign(promotion, updateData);
    return await this.promotionRepository.save(promotion);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const promotion = await this.findOne(id, companyId);
    await this.promotionRepository.remove(promotion);
  }

  async incrementViewCount(id: number): Promise<void> {
    await this.promotionRepository.increment({ id }, 'viewCount', 1);
  }

  async updateSortOrder(companyId: number, sortData: { id: number; sortOrder: number }[]): Promise<void> {
    const queryRunner = this.promotionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of sortData) {
        await queryRunner.manager.update(Promotion, 
          { id: item.id, companyId }, 
          { sortOrder: item.sortOrder }
        );
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getPromotionsByCategory(companyId: number, categoryId: number, limit = 10): Promise<Promotion[]> {
    return await this.promotionRepository.find({
      where: { 
        companyId, 
        categoryId, 
        isActive: true 
      },
      relations: ['category'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      take: limit,
    });
  }

  async getPopularPromotions(companyId: number, limit = 5): Promise<Promotion[]> {
    return await this.promotionRepository.find({
      where: { companyId, isActive: true },
      relations: ['category'],
      order: { viewCount: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
  }

  async getRecentPromotions(companyId: number, limit = 5): Promise<Promotion[]> {
    return await this.promotionRepository.find({
      where: { companyId, isActive: true },
      relations: ['category'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getActivePromotionsCount(companyId: number): Promise<number> {
    const now = new Date();
    return await this.promotionRepository.count({
      where: {
        companyId,
        isActive: true,
      },
    });
  }
}