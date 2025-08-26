import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
  Put,
} from '@nestjs/common';
import { PromotionService, PromotionQueryOptions } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('promotions')
@UseGuards(JwtAuthGuard)
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN', 'SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async create(@Request() req, @Body() createPromotionDto: CreatePromotionDto) {
    const { companyId } = req.user;
    return await this.promotionService.create(companyId, createPromotionDto);
  }

  @Get()
  async findAll(@Request() req, @Query() query: any) {
    const { companyId } = req.user;
    
    // 轉換查詢參數類型
    const options: PromotionQueryOptions = {
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      categoryId: query.categoryId ? parseInt(query.categoryId) : undefined,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      status: query.status || undefined,
      title: query.title || undefined,
      createdFrom: query.createdFrom || undefined,
      createdTo: query.createdTo || undefined,
    };
    
    return await this.promotionService.findAll(companyId, options);
  }

  @Get('active')
  async findAllActive(@Request() req, @Query() query: PromotionQueryOptions) {
    const { companyId } = req.user;
    return await this.promotionService.findAllActive(companyId, query);
  }

  @Get('popular')
  async getPopular(@Request() req, @Query('limit') limit = 5) {
    const { companyId } = req.user;
    return await this.promotionService.getPopularPromotions(companyId, Number(limit));
  }

  @Get('recent')
  async getRecent(@Request() req, @Query('limit') limit = 5) {
    const { companyId } = req.user;
    return await this.promotionService.getRecentPromotions(companyId, Number(limit));
  }

  @Get('stats')
  async getStats(@Request() req) {
    const { companyId } = req.user;
    const activeCount = await this.promotionService.getActivePromotionsCount(companyId);
    return { activePromotionsCount: activeCount };
  }

  @Get('category/:categoryId')
  async getByCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Request() req,
    @Query('limit') limit = 10,
  ) {
    const { companyId } = req.user;
    return await this.promotionService.getPromotionsByCategory(companyId, categoryId, Number(limit));
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const { companyId } = req.user;
    return await this.promotionService.findOne(id, companyId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN', 'SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    const { companyId } = req.user;
    return await this.promotionService.update(id, companyId, updatePromotionDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN', 'SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const { companyId } = req.user;
    await this.promotionService.remove(id, companyId);
    return { message: '優惠活動已刪除' };
  }

  @Put('sort-order')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN', 'SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async updateSortOrder(
    @Request() req,
    @Body() sortData: { id: number; sortOrder: number }[],
  ) {
    const { companyId } = req.user;
    await this.promotionService.updateSortOrder(companyId, sortData);
    return { message: '排序已更新' };
  }

  @Post(':id/view')
  async incrementView(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const { companyId } = req.user;
    // 驗證活動存在
    await this.promotionService.findOne(id, companyId);
    await this.promotionService.incrementViewCount(id);
    return { message: '瀏覽次數已更新' };
  }
}