import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In, IsNull } from 'typeorm';
import { Product, ProductStatus } from './product.entity';
import { ProductVariant, ProductVariantStatus } from './product-variant.entity';
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
    @InjectRepository(ProductVariant)
    private productVariantRepository: Repository<ProductVariant>,
    private auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateProductDto, user: User, ip: string, platform: string): Promise<Product> {
    const { variants, ...productData } = dto;
    
    // 檢查 SKU 是否重複
    const existingSku = await this.productRepository.findOne({
      where: { sku: productData.sku, deleted_at: IsNull() }
    });
    
    if (existingSku) {
      throw new BadRequestException('商品編號已存在');
    }

    // 檢查變體 SKU 是否重複
    if (variants && variants.length > 0) {
      const variantSkus = variants.map(v => v.sku);
      const existingVariantSkus = await this.productVariantRepository.find({
        where: { sku: In(variantSkus) }
      });
      
      if (existingVariantSkus.length > 0) {
        throw new BadRequestException(`變體 SKU 已存在: ${existingVariantSkus.map(v => v.sku).join(', ')}`);
      }
    }

    const product = this.productRepository.create({
      ...productData,
      company_id: user.company_id,
      created_by_id: user.id,
    });

    const savedProduct = await this.productRepository.save(product);

    // 創建變體
    if (variants && variants.length > 0) {
      const productVariants = variants.map((variant, index) => 
        this.productVariantRepository.create({
          ...variant,
          product_id: savedProduct.id,
          is_default: index === 0 || variant.is_default, // 第一個變體或明確指定的為預設
        })
      );

      // 確保只有一個預設變體
      const defaultCount = productVariants.filter(v => v.is_default).length;
      if (defaultCount > 1) {
        productVariants.forEach((v, i) => {
          v.is_default = i === 0;
        });
      }

      await this.productVariantRepository.save(productVariants);
    } else {
      // 如果沒有提供變體，創建一個預設變體
      const defaultVariant = this.productVariantRepository.create({
        product_id: savedProduct.id,
        variant_name: '預設規格',
        sku: `${savedProduct.sku}-DEFAULT`,
        price: savedProduct.price,
        original_price: savedProduct.original_price,
        stock_quantity: savedProduct.stock_quantity,
        min_stock: savedProduct.min_stock,
        variant_options: {},
        images: savedProduct.images,
        is_default: true,
        status: ProductVariantStatus.ACTIVE,
      });

      await this.productVariantRepository.save(defaultVariant);
    }

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
      .leftJoinAndSelect('product.variants', 'variants')
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
      relations: ['category', 'company', 'created_by', 'variants', 'shipping_rule_template', 'shipping_rule_template.items'],
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    // 排序變體：預設變體在前，然後按 sort_order
    if (product.variants) {
      product.variants.sort((a, b) => {
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        return a.sort_order - b.sort_order;
      });
    }

    // 如果產品有運費方案，將其轉換為舊格式的 shipping_rules 以保持向後兼容
    if (product.shipping_rule_template && product.shipping_rule_template.items) {
      product.shipping_rules = product.shipping_rule_template.items.map(item => ({
        method: item.method,
        base_fee: Number(item.base_fee),
        free_shipping_threshold: Number(item.free_shipping_threshold),
      }));
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
    const { variants, clearVariants, ...productData } = dto;

    // 檢查 SKU 是否重複（排除自己）
    if (productData.sku && productData.sku !== product.sku) {
      const existingSku = await this.productRepository.findOne({
        where: { sku: productData.sku, deleted_at: IsNull() }
      });
      
      if (existingSku && existingSku.id !== id) {
        throw new BadRequestException('商品編號已存在');
      }
    }

    // 檢查變體 SKU 是否重複（排除現有的變體）
    if (variants && variants.length > 0) {
      const variantSkus = variants.map(v => v.sku);
      const existingVariantSkus = await this.productVariantRepository.find({
        where: { sku: In(variantSkus) }
      });
      
      // 過濾掉屬於當前商品的變體
      const currentProductVariants = await this.productVariantRepository.find({
        where: { product_id: id }
      });
      const currentVariantSkus = currentProductVariants.map(v => v.sku);
      
      const conflictingSkus = existingVariantSkus.filter(v => 
        !currentVariantSkus.includes(v.sku)
      );
      
      if (conflictingSkus.length > 0) {
        throw new BadRequestException(`變體 SKU 已存在: ${conflictingSkus.map(v => v.sku).join(', ')}`);
      }
    }

    // 更新主商品資料
    Object.assign(product, productData);
    const updatedProduct = await this.productRepository.save(product);

    // 處理變體更新
    if (clearVariants || (variants && variants.length === 0)) {
      // 清除所有變體
      await this.productVariantRepository.delete({ product_id: id });
    } else if (variants && variants.length > 0) {
      // 刪除現有變體
      await this.productVariantRepository.delete({ product_id: id });
      
      // 創建新變體
      const productVariants = variants.map((variant, index) => 
        this.productVariantRepository.create({
          ...variant,
          product_id: id,
          is_default: index === 0 || variant.is_default, // 第一個變體或明確指定的為預設
        })
      );

      // 確保只有一個預設變體
      const defaultCount = productVariants.filter(v => v.is_default).length;
      if (defaultCount > 1) {
        productVariants.forEach((v, i) => {
          v.is_default = i === 0;
        });
      }

      await this.productVariantRepository.save(productVariants);
    }

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
      .leftJoinAndSelect('product.variants', 'variants', 'variants.status = :variantStatus')
      .leftJoinAndSelect('product.shipping_rule_template', 'shipping_rule_template')
      .leftJoinAndSelect('shipping_rule_template.items', 'shipping_rule_items')
      .where('product.deleted_at IS NULL')
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.is_visible = true')
      .andWhere('company.code = :companyCode', { companyCode })
      .setParameter('variantStatus', 'ACTIVE');

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