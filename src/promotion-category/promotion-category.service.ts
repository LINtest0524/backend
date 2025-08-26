import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromotionCategory } from './promotion-category.entity';
import { CreatePromotionCategoryDto } from './dto/create-promotion-category.dto';
import { UpdatePromotionCategoryDto } from './dto/update-promotion-category.dto';

@Injectable()
export class PromotionCategoryService {
  constructor(
    @InjectRepository(PromotionCategory)
    private promotionCategoryRepository: Repository<PromotionCategory>,
  ) {}

  async create(companyId: number, createPromotionCategoryDto: CreatePromotionCategoryDto): Promise<PromotionCategory> {
    const category = this.promotionCategoryRepository.create({
      ...createPromotionCategoryDto,
      companyId,
    });

    return await this.promotionCategoryRepository.save(category);
  }

  async findAll(companyId: number): Promise<PromotionCategory[]> {
    return await this.promotionCategoryRepository.find({
      where: { companyId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findAllActive(companyId: number): Promise<PromotionCategory[]> {
    return await this.promotionCategoryRepository.find({
      where: { companyId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number, companyId: number): Promise<PromotionCategory> {
    const category = await this.promotionCategoryRepository.findOne({
      where: { id, companyId },
      relations: ['promotions'],
    });

    if (!category) {
      throw new NotFoundException(`活動類型 ID ${id} 不存在`);
    }

    return category;
  }

  async update(id: number, companyId: number, updatePromotionCategoryDto: UpdatePromotionCategoryDto): Promise<PromotionCategory> {
    const category = await this.findOne(id, companyId);

    Object.assign(category, updatePromotionCategoryDto);
    return await this.promotionCategoryRepository.save(category);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const category = await this.findOne(id, companyId);
    await this.promotionCategoryRepository.remove(category);
  }

  async updateSortOrder(companyId: number, sortData: { id: number; sortOrder: number }[]): Promise<void> {
    const queryRunner = this.promotionCategoryRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of sortData) {
        await queryRunner.manager.update(PromotionCategory, 
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

  async getPromotionCount(categoryId: number, companyId: number): Promise<number> {
    const category = await this.promotionCategoryRepository.findOne({
      where: { id: categoryId, companyId },
      relations: ['promotions'],
    });

    return category ? category.promotions.filter(p => p.isActive).length : 0;
  }
}