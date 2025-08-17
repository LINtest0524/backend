import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In, IsNull } from 'typeorm';
import { Product, ProductStatus } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { User } from '../user/user.entity';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateProductDto, user: User, ip: string, platform: string): Promise<Product> {
    // 檢查 SKU 是否重複
    const existingSku = await this.productRepository.findOne({
      where: { sku: dto.sku, deleted_at: IsNull() }
    });
    
    if (existingSku) {
      throw new BadRequestException('商品編號已存在');
    }

    const product = this.productRepository.create({
      ...dto,
      company_id: user.company_id,
      created_by_id: user.id,
    });

    const savedProduct = await this.productRepository.save(product);

    // 記錄審計日誌 - 暫時註解，等待實現
    // await this.auditLogService.log({
    //   user_id: user.id,
    //   action: 'CREATE_PRODUCT',
    //   target_type: 'PRODUCT',
    //   target_id: savedProduct.id.toString(),
    //   details: `創建商品: ${savedProduct.name}`,
    //   ip_address: ip,
    //   user_agent: platform,
    // });

    return savedProduct;
  }

  async findAll(user: User, query: ProductQueryDto) {
    const {
      search,
      category_id,
      status,
      is_featured,
      min_price,
      max_price,
      sort_by = 'created_at',
      sort_order = 'DESC',
      page = 1,
      limit = 20,
      tags,
    } = query;

    const queryBuilder = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.company', 'company')
      .where('product.deleted_at IS NULL');

    // 權限控制
    if (!['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role)) {
      queryBuilder.andWhere('product.company_id = :companyId', { companyId: user.company_id });
    }

    // 搜尋條件
    if (search) {
      queryBuilder.andWhere(
        '(product.name LIKE :search OR product.description LIKE :search OR product.sku LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (category_id) {
      queryBuilder.andWhere('product.category_id = :categoryId', { categoryId: category_id });
    }

    if (status) {
      queryBuilder.andWhere('product.status = :status', { status });
    }

    if (is_featured !== undefined) {
      queryBuilder.andWhere('product.is_featured = :isFeatured', { isFeatured: is_featured });
    }

    if (min_price !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice: min_price });
    }

    if (max_price !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice: max_price });
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      queryBuilder.andWhere('product.tags && :tags', { tags: tagArray });
    }

    // 排序
    queryBuilder.orderBy(`product.${sort_by}`, sort_order);

    // 分頁
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['category', 'company', 'created_by'],
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    return product;
  }

  async findOneSecured(id: number, user: User): Promise<Product> {
    const product = await this.findOne(id);

    // 權限檢查
    if (!['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role) && 
        product.company_id !== user.company_id) {
      throw new ForbiddenException('無權限查看此商品');
    }

    return product;
  }

  async update(id: number, dto: UpdateProductDto, user: User, ip: string, platform: string): Promise<Product> {
    const product = await this.findOneSecured(id, user);

    // 檢查 SKU 是否重複（排除自己）
    if (dto.sku && dto.sku !== product.sku) {
      const existingSku = await this.productRepository.findOne({
        where: { sku: dto.sku, deleted_at: IsNull() }
      });
      
      if (existingSku && existingSku.id !== id) {
        throw new BadRequestException('商品編號已存在');
      }
    }

    Object.assign(product, dto);
    const updatedProduct = await this.productRepository.save(product);

    // 記錄審計日誌 - 暫時註解，等待實現
    // await this.auditLogService.log({
    //   user_id: user.id,
    //   action: 'UPDATE_PRODUCT',
    //   target_type: 'PRODUCT',
    //   target_id: id.toString(),
    //   details: `更新商品: ${updatedProduct.name}`,
    //   ip_address: ip,
    //   user_agent: platform,
    // });

    return updatedProduct;
  }

  async remove(id: number, user: User, ip: string, platform: string): Promise<void> {
    const product = await this.findOneSecured(id, user);

    // 軟刪除
    product.deleted_at = new Date();
    await this.productRepository.save(product);

    // 記錄審計日誌 - 暫時註解，等待實現
    // await this.auditLogService.log({
    //   user_id: user.id,
    //   action: 'DELETE_PRODUCT',
    //   target_type: 'PRODUCT',
    //   target_id: id.toString(),
    //   details: `刪除商品: ${product.name}`,
    //   ip_address: ip,
    //   user_agent: platform,
    // });
  }

  async updateStock(id: number, quantity: number, user: User): Promise<Product> {
    const product = await this.findOneSecured(id, user);
    
    if (product.stock_quantity + quantity < 0) {
      throw new BadRequestException('庫存不足');
    }

    product.stock_quantity += quantity;
    return await this.productRepository.save(product);
  }

  async findByCompany(companyId: number, user: User) {
    // 權限檢查
    if (!['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role) && user.company_id !== companyId) {
      throw new ForbiddenException('無權限查看其他公司的商品');
    }

    return await this.productRepository.find({
      where: { company_id: companyId, deleted_at: IsNull() },
      relations: ['category'],
      order: { sort_order: 'ASC', created_at: 'DESC' },
    });
  }

  // 前端公開 API - 不需要權限
  async findPublicProducts(companyCode: string, query: ProductQueryDto) {
    const queryBuilder = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.company', 'company')
      .where('product.deleted_at IS NULL')
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.is_visible = true')
      .andWhere('company.code = :companyCode', { companyCode });

    // 應用篩選條件（與 findAll 類似，但不需要權限檢查）
    const {
      search,
      category_id,
      is_featured,
      min_price,
      max_price,
      sort_by = 'sort_order',
      sort_order = 'ASC',
      page = 1,
      limit = 20,
      tags,
    } = query;

    if (search) {
      queryBuilder.andWhere(
        '(product.name LIKE :search OR product.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (category_id) {
      queryBuilder.andWhere('product.category_id = :categoryId', { categoryId: category_id });
    }

    if (is_featured !== undefined) {
      queryBuilder.andWhere('product.is_featured = :isFeatured', { isFeatured: is_featured });
    }

    if (min_price !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice: min_price });
    }

    if (max_price !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice: max_price });
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      queryBuilder.andWhere('product.tags && :tags', { tags: tagArray });
    }

    // 排序
    queryBuilder.orderBy(`product.${sort_by}`, sort_order);
    if (sort_by !== 'sort_order') {
      queryBuilder.addOrderBy('product.sort_order', 'ASC');
    }

    // 分頁
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}