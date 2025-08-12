import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleCategory, CategoryStatus } from './article-category.entity';
import { CreateArticleCategoryDto } from './dto/create-article-category.dto';
import { UpdateArticleCategoryDto } from './dto/update-article-category.dto';

@Injectable()
export class ArticleCategoryService {
  constructor(
    @InjectRepository(ArticleCategory)
    private categoryRepository: Repository<ArticleCategory>,
  ) {}

  async create(createCategoryDto: CreateArticleCategoryDto): Promise<ArticleCategory> {
    // 檢查 slug 是否已存在
    const existingCategory = await this.categoryRepository.findOne({
      where: { slug: createCategoryDto.slug, companyId: createCategoryDto.companyId }
    });
    
    if (existingCategory) {
      throw new ConflictException('分類代碼已存在');
    }

    const category = this.categoryRepository.create(createCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async findByCompany(companyId: number) {
    return await this.categoryRepository.find({
      where: { companyId },
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
  }

  async findActiveByCompany(companyId: number) {
    return await this.categoryRepository.find({
      where: { companyId, status: CategoryStatus.ACTIVE },
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<ArticleCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['company'],
    });
    
    if (!category) {
      throw new NotFoundException(`分類 ID ${id} 不存在`);
    }
    
    return category;
  }

  async findBySlug(slug: string, companyId: number): Promise<ArticleCategory> {
    const category = await this.categoryRepository.findOne({
      where: { slug, companyId, status: CategoryStatus.ACTIVE },
    });
    
    if (!category) {
      throw new NotFoundException(`分類 ${slug} 不存在`);
    }
    
    return category;
  }

  async update(id: number, updateCategoryDto: UpdateArticleCategoryDto): Promise<ArticleCategory> {
    const category = await this.findOne(id);
    
    // 如果要更新 slug，檢查是否與其他分類衝突
    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { slug: updateCategoryDto.slug, companyId: category.companyId }
      });
      
      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException('分類代碼已存在');
      }
    }
    
    Object.assign(category, updateCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
  }
}