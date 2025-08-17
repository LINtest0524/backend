import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, IsNull } from 'typeorm';
import { ProductCategory } from './product-category.entity';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { User } from '../user/user.entity';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class ProductCategoryService {
  constructor(
    @InjectRepository(ProductCategory)
    private categoryRepository: TreeRepository<ProductCategory>,
    private auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateProductCategoryDto, user: User, ip: string, platform: string): Promise<ProductCategory> {
    // 檢查 slug 是否重複
    const existingSlug = await this.categoryRepository.findOne({
      where: { slug: dto.slug, deleted_at: IsNull() }
    });
    
    if (existingSlug) {
      throw new BadRequestException('分類 slug 已存在');
    }

    let parent: ProductCategory | null = null;
    if (dto.parent_id) {
      parent = await this.findOneSecured(dto.parent_id, user);
    }

    const category = this.categoryRepository.create({
      ...dto,
      parent: parent || undefined,
      company_id: user.company_id,
      created_by_id: user.id,
    });

    const savedCategory = await this.categoryRepository.save(category);

    // 記錄審計日誌 - 暫時註解，等待實現
    // await this.auditLogService.log({
    //   user_id: user.id,
    //   action: 'CREATE_PRODUCT_CATEGORY',
    //   target_type: 'PRODUCT_CATEGORY',
    //   target_id: savedCategory.id.toString(),
    //   details: `創建商品分類: ${savedCategory.name}`,
    //   ip_address: ip,
    //   user_agent: platform,
    // });

    return savedCategory;
  }

  async findAll(user: User) {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category')
      .leftJoinAndSelect('category.company', 'company')
      .leftJoinAndSelect('category.parent', 'parent')
      .where('category.deleted_at IS NULL');

    // 權限控制
    if (!['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role)) {
      queryBuilder.andWhere('category.company_id = :companyId', { companyId: user.company_id });
    }

    queryBuilder.orderBy('category.sort_order', 'ASC')
      .addOrderBy('category.name', 'ASC');

    return await queryBuilder.getMany();
  }

  async findTree(user: User) {
    // 先獲取所有分類
    const categories = await this.findAll(user);
    
    // 使用 TypeORM 的樹狀結構方法
    const trees = await this.categoryRepository.findTrees();
    
    // 過濾出屬於該用戶公司的分類樹
    if (['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role)) {
      return trees;
    }
    
    return trees.filter(tree => tree.company_id === user.company_id);
  }

  async findOne(id: number): Promise<ProductCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['company', 'parent', 'children', 'created_by'],
    });

    if (!category) {
      throw new NotFoundException('分類不存在');
    }

    return category;
  }

  async findOneSecured(id: number, user: User): Promise<ProductCategory> {
    const category = await this.findOne(id);

    // 權限檢查
    if (!['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role) && 
        category.company_id !== user.company_id) {
      throw new ForbiddenException('無權限查看此分類');
    }

    return category;
  }

  async update(id: number, dto: UpdateProductCategoryDto, user: User, ip: string, platform: string): Promise<ProductCategory> {
    const category = await this.findOneSecured(id, user);

    // 檢查 slug 是否重複（排除自己）
    if (dto.slug && dto.slug !== category.slug) {
      const existingSlug = await this.categoryRepository.findOne({
        where: { slug: dto.slug, deleted_at: IsNull() }
      });
      
      if (existingSlug && existingSlug.id !== id) {
        throw new BadRequestException('分類 slug 已存在');
      }
    }

    // 處理父分類變更
    if (dto.parent_id !== undefined) {
      if (dto.parent_id === null) {
        category.parent = undefined as any;
      } else {
        // 檢查不能設定自己為父分類
        if (dto.parent_id === id) {
          throw new BadRequestException('不能設定自己為父分類');
        }
        
        // 檢查不能設定子分類為父分類（避免循環）
        const descendants = await this.categoryRepository.findDescendants(category);
        const descendantIds = descendants.map(d => d.id);
        if (descendantIds.includes(dto.parent_id)) {
          throw new BadRequestException('不能設定子分類為父分類');
        }
        
        category.parent = await this.findOneSecured(dto.parent_id, user);
      }
    }

    Object.assign(category, dto);
    const updatedCategory = await this.categoryRepository.save(category);

    // 記錄審計日誌 - 暫時註解，等待實現
    // await this.auditLogService.log({
    //   user_id: user.id,
    //   action: 'UPDATE_PRODUCT_CATEGORY',
    //   target_type: 'PRODUCT_CATEGORY',
    //   target_id: id.toString(),
    //   details: `更新商品分類: ${updatedCategory.name}`,
    //   ip_address: ip,
    //   user_agent: platform,
    // });

    return updatedCategory;
  }

  async remove(id: number, user: User, ip: string, platform: string): Promise<void> {
    const category = await this.findOneSecured(id, user);

    // 檢查是否有子分類
    const children = await this.categoryRepository.findDescendants(category);
    if (children.length > 1) { // 包含自己，所以 > 1
      throw new BadRequestException('請先刪除子分類');
    }

    // 檢查是否有商品使用此分類
    const productCount = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.products', 'product')
      .where('category.id = :id', { id })
      .andWhere('product.deleted_at IS NULL')
      .getCount();

    if (productCount > 0) {
      throw new BadRequestException('此分類下還有商品，無法刪除');
    }

    // 軟刪除
    category.deleted_at = new Date();
    await this.categoryRepository.save(category);

    // 記錄審計日誌 - 暫時註解，等待實現
    // await this.auditLogService.log({
    //   user_id: user.id,
    //   action: 'DELETE_PRODUCT_CATEGORY',
    //   target_type: 'PRODUCT_CATEGORY',
    //   target_id: id.toString(),
    //   details: `刪除商品分類: ${category.name}`,
    //   ip_address: ip,
    //   user_agent: platform,
    // });
  }

  async findByCompany(companyId: number, user: User) {
    // 權限檢查
    if (!['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role) && user.company_id !== companyId) {
      throw new ForbiddenException('無權限查看其他公司的分類');
    }

    return await this.categoryRepository.find({
      where: { company_id: companyId, deleted_at: IsNull() },
      relations: ['parent'],
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  // 前端公開 API - 不需要權限
  async findPublicCategories(companyCode: string) {
    return await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.company', 'company')
      .leftJoinAndSelect('category.children', 'children')
      .where('category.deleted_at IS NULL')
      .andWhere('category.is_active = true')
      .andWhere('category.is_visible = true')
      .andWhere('company.code = :companyCode', { companyCode })
      .andWhere('category.parent IS NULL') // 只取根分類
      .orderBy('category.sort_order', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .getMany();
  }

  async findPublicCategoryTree(companyCode: string) {
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.company', 'company')
      .where('category.deleted_at IS NULL')
      .andWhere('category.is_active = true')
      .andWhere('category.is_visible = true')
      .andWhere('company.code = :companyCode', { companyCode })
      .orderBy('category.sort_order', 'ASC')
      .getMany();

    // 建立樹狀結構
    const categoryMap = new Map();
    const roots: ProductCategory[] = [];

    // 先建立所有節點的映射
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // 建立父子關係
    categories.forEach(cat => {
      const node = categoryMap.get(cat.id);
      if (cat.parent) {
        const parent = categoryMap.get(cat.parent.id);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}