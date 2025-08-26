import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PromotionService, PromotionQueryOptions } from '../promotion/promotion.service';
import { PromotionCategoryService } from '../promotion-category/promotion-category.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('portal/:companySlug/promotions')
export class PortalPromotionController {
  constructor(
    private readonly promotionService: PromotionService,
    private readonly promotionCategoryService: PromotionCategoryService,
  ) {}

  // 獲取活動分類列表
  @Get('categories')
  async getCategories(@Param('companySlug') companySlug: string) {
    const companyId = companySlug === 'a' ? 1 : 2; // 簡化處理，實際應該從數據庫查詢
    
    return await this.promotionCategoryService.findAllActive(companyId);
  }

  // 獲取活動列表
  @Get()
  async getPromotions(@Param('companySlug') companySlug: string, @Query() query: PromotionQueryOptions) {
    const companyId = companySlug === 'a' ? 1 : 2;
    
    return await this.promotionService.findAllActive(companyId, query);
  }

  // 獲取熱門活動
  @Get('popular')
  async getPopularPromotions(@Param('companySlug') companySlug: string, @Query('limit') limit = 5) {
    const companyId = companySlug === 'a' ? 1 : 2;
    
    return await this.promotionService.getPopularPromotions(companyId, Number(limit));
  }

  // 獲取最新活動
  @Get('recent')
  async getRecentPromotions(@Param('companySlug') companySlug: string, @Query('limit') limit = 5) {
    const companyId = companySlug === 'a' ? 1 : 2;
    
    return await this.promotionService.getRecentPromotions(companyId, Number(limit));
  }

  // 根據分類獲取活動
  @Get('category/:categoryId')
  async getPromotionsByCategory(
    @Param('companySlug') companySlug: string,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query('limit') limit = 10,
  ) {
    const companyId = companySlug === 'a' ? 1 : 2;
    
    return await this.promotionService.getPromotionsByCategory(companyId, categoryId, Number(limit));
  }

  // 獲取活動詳情
  @Get(':id')
  async getPromotionDetail(@Param('companySlug') companySlug: string, @Param('id', ParseIntPipe) id: number) {
    const companyId = companySlug === 'a' ? 1 : 2;
    
    return await this.promotionService.findOne(id, companyId);
  }

  // 增加瀏覽次數（可選的獨立端點）
  @Post(':id/view')
  async incrementView(@Param('companySlug') companySlug: string, @Param('id', ParseIntPipe) id: number) {
    const companyId = companySlug === 'a' ? 1 : 2;
    
    // 驗證活動存在
    await this.promotionService.findOne(id, companyId);
    await this.promotionService.incrementViewCount(id);
    return { message: '瀏覽次數已更新' };
  }
}