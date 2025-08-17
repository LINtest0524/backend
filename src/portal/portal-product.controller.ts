import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductService } from '../product/product.service';
import { ProductCategoryService } from '../product-category/product-category.service';
import { ProductQueryDto } from '../product/dto/product-query.dto';

@Controller('portal/product')
export class PortalProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: ProductCategoryService,
  ) {}

  @Get()
  async findProducts(@Query('company') company: string, @Query() query: ProductQueryDto) {
    return this.productService.findPublicProducts(company, query);
  }

  @Get('featured')
  async findFeaturedProducts(@Query('company') company: string, @Query() query: ProductQueryDto) {
    return this.productService.findPublicProducts(company, { ...query, is_featured: true });
  }

  @Get('categories')
  async findCategories(@Query('company') company: string) {
    return this.categoryService.findPublicCategories(company);
  }

  @Get('categories/tree')
  async findCategoryTree(@Query('company') company: string) {
    return this.categoryService.findPublicCategoryTree(company);
  }

  @Get('category/:categoryId')
  async findProductsByCategory(
    @Param('categoryId') categoryId: number,
    @Query('company') company: string,
    @Query() query: ProductQueryDto
  ) {
    return this.productService.findPublicProducts(company, { ...query, category_id: categoryId });
  }

  @Get(':id')
  async findProduct(@Param('id') id: number, @Query('company') company: string) {
    // 這裡需要一個公開的商品詳情方法
    return this.productService.findOne(id);
  }
}