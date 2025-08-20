import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Injectable()
export class ProductVariantService {
  constructor(
    @InjectRepository(ProductVariant)
    private productVariantRepository: Repository<ProductVariant>,
  ) {}

  async create(createProductVariantDto: CreateProductVariantDto): Promise<ProductVariant> {
    // 檢查 SKU 是否已存在
    const existingSku = await this.productVariantRepository.findOne({
      where: { sku: createProductVariantDto.sku }
    });
    
    if (existingSku) {
      throw new BadRequestException('SKU 已存在');
    }

    // 如果設為預設變體，先取消其他預設變體
    if (createProductVariantDto.is_default) {
      await this.productVariantRepository.update(
        { product_id: createProductVariantDto.product_id, is_default: true },
        { is_default: false }
      );
    }

    const variant = this.productVariantRepository.create(createProductVariantDto);
    return await this.productVariantRepository.save(variant);
  }

  async findAll(): Promise<ProductVariant[]> {
    return await this.productVariantRepository.find({
      relations: ['product'],
      order: { sort_order: 'ASC', created_at: 'DESC' }
    });
  }

  async findByProductId(productId: number): Promise<ProductVariant[]> {
    return await this.productVariantRepository.find({
      where: { product_id: productId },
      order: { sort_order: 'ASC', is_default: 'DESC' }
    });
  }

  async findOne(id: number): Promise<ProductVariant> {
    const variant = await this.productVariantRepository.findOne({
      where: { id },
      relations: ['product']
    });

    if (!variant) {
      throw new NotFoundException('產品變體不存在');
    }

    return variant;
  }

  async findBySku(sku: string): Promise<ProductVariant> {
    const variant = await this.productVariantRepository.findOne({
      where: { sku },
      relations: ['product']
    });

    if (!variant) {
      throw new NotFoundException('產品變體不存在');
    }

    return variant;
  }

  async update(id: number, updateProductVariantDto: UpdateProductVariantDto): Promise<ProductVariant> {
    const variant = await this.findOne(id);

    // 檢查 SKU 是否已被其他變體使用
    if (updateProductVariantDto.sku && updateProductVariantDto.sku !== variant.sku) {
      const existingSku = await this.productVariantRepository.findOne({
        where: { sku: updateProductVariantDto.sku }
      });
      
      if (existingSku && existingSku.id !== id) {
        throw new BadRequestException('SKU 已存在');
      }
    }

    // 如果設為預設變體，先取消其他預設變體
    if (updateProductVariantDto.is_default) {
      await this.productVariantRepository.update(
        { product_id: variant.product_id, is_default: true },
        { is_default: false }
      );
    }

    await this.productVariantRepository.update(id, updateProductVariantDto);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const variant = await this.findOne(id);
    
    // 檢查是否為預設變體且是該產品的唯一變體
    if (variant.is_default) {
      const variantCount = await this.productVariantRepository.count({
        where: { product_id: variant.product_id }
      });
      
      if (variantCount === 1) {
        throw new BadRequestException('無法刪除產品的唯一變體');
      }
      
      // 如果刪除的是預設變體，需要設定另一個變體為預設
      const otherVariants = await this.productVariantRepository.find({
        where: { product_id: variant.product_id },
        order: { sort_order: 'ASC' }
      });
      
      const newDefaultVariant = otherVariants.find(v => v.id !== id);
      if (newDefaultVariant) {
        await this.productVariantRepository.update(newDefaultVariant.id, { is_default: true });
      }
    }

    await this.productVariantRepository.delete(id);
  }

  async updateStock(id: number, quantity: number): Promise<ProductVariant> {
    const variant = await this.findOne(id);
    variant.stock_quantity = Math.max(0, variant.stock_quantity + quantity);
    return await this.productVariantRepository.save(variant);
  }

  async getDefaultVariant(productId: number): Promise<ProductVariant | null> {
    return await this.productVariantRepository.findOne({
      where: { product_id: productId, is_default: true }
    });
  }
}