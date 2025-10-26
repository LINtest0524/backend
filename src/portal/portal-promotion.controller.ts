import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Post,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { PromotionService, PromotionQueryOptions } from '../promotion/promotion.service';
import { PromotionCategoryService } from '../promotion-category/promotion-category.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyService } from '../company/company.service';

@Controller('portal/promotions')
export class PortalPromotionController {
  constructor(
    private readonly promotionService: PromotionService,
    private readonly promotionCategoryService: PromotionCategoryService,
    private readonly companyService: CompanyService,
  ) {}

  private async getCompanyIdByCode(companyCode: string): Promise<number> {
    const company = await this.companyService.findByCode(companyCode);
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company.id;
  }

  // 獲取活動分類列表
  @Get('categories')
  async getCategories(@Query('company') companyCode: string) {
    if (!companyCode) {
      throw new NotFoundException('Company code is required');
    }
    const companyId = await this.getCompanyIdByCode(companyCode);
    return await this.promotionCategoryService.findAllActive(companyId);
  }

  // 獲取活動列表
  @Get()
  async getPromotions(@Query('company') companyCode: string, @Query() query: PromotionQueryOptions) {
    if (!companyCode) {
      throw new NotFoundException('Company code is required');
    }
    const companyId = await this.getCompanyIdByCode(companyCode);
    return await this.promotionService.findAllActive(companyId, query);
  }

  // 獲取熱門活動
  @Get('popular')
  async getPopularPromotions(@Query('company') companyCode: string, @Query('limit') limit = 5) {
    if (!companyCode) {
      throw new NotFoundException('Company code is required');
    }
    const companyId = await this.getCompanyIdByCode(companyCode);
    return await this.promotionService.getPopularPromotions(companyId, Number(limit));
  }

  // 獲取最新活動
  @Get('recent')
  async getRecentPromotions(@Query('company') companyCode: string, @Query('limit') limit = 5) {
    if (!companyCode) {
      throw new NotFoundException('Company code is required');
    }
    const companyId = await this.getCompanyIdByCode(companyCode);
    return await this.promotionService.getRecentPromotions(companyId, Number(limit));
  }

  // 獲取活動詳情
  @Get(':id')
  async getPromotionDetail(@Param('id', ParseIntPipe) id: number, @Query('company') companyCode: string) {
    if (!companyCode) {
      throw new NotFoundException('Company code is required');
    }
    const companyId = await this.getCompanyIdByCode(companyCode);
    return await this.promotionService.findOne(id, companyId);
  }

  // 增加瀏覽次數（可選的獨立端點）
  @Post(':id/view')
  async incrementView(@Param('id', ParseIntPipe) id: number, @Query('company') companyCode: string) {
    if (!companyCode) {
      throw new NotFoundException('Company code is required');
    }
    const companyId = await this.getCompanyIdByCode(companyCode);
    
    // 驗證活動存在
    await this.promotionService.findOne(id, companyId);
    await this.promotionService.incrementViewCount(id);
    return { message: '瀏覽次數已更新' };
  }
}