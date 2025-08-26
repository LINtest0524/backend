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
  Put,
} from '@nestjs/common';
import { PromotionCategoryService } from './promotion-category.service';
import { CreatePromotionCategoryDto } from './dto/create-promotion-category.dto';
import { UpdatePromotionCategoryDto } from './dto/update-promotion-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('promotion-categories')
@UseGuards(JwtAuthGuard)
export class PromotionCategoryController {
  constructor(private readonly promotionCategoryService: PromotionCategoryService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN', 'SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async create(@Request() req, @Body() createPromotionCategoryDto: CreatePromotionCategoryDto) {
    const { companyId } = req.user;
    return await this.promotionCategoryService.create(companyId, createPromotionCategoryDto);
  }

  @Get()
  async findAll(@Request() req) {
    const { companyId } = req.user;
    return await this.promotionCategoryService.findAll(companyId);
  }

  @Get('active')
  async findAllActive(@Request() req) {
    const { companyId } = req.user;
    return await this.promotionCategoryService.findAllActive(companyId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const { companyId } = req.user;
    return await this.promotionCategoryService.findOne(id, companyId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN', 'SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updatePromotionCategoryDto: UpdatePromotionCategoryDto,
  ) {
    const { companyId } = req.user;
    return await this.promotionCategoryService.update(id, companyId, updatePromotionCategoryDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN', 'SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const { companyId } = req.user;
    await this.promotionCategoryService.remove(id, companyId);
    return { message: '活動類型已刪除' };
  }

  @Put('sort-order')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN', 'SUPER_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async updateSortOrder(
    @Request() req,
    @Body() sortData: { id: number; sortOrder: number }[],
  ) {
    const { companyId } = req.user;
    await this.promotionCategoryService.updateSortOrder(companyId, sortData);
    return { message: '排序已更新' };
  }

  @Get(':id/promotion-count')
  async getPromotionCount(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const { companyId } = req.user;
    return {
      count: await this.promotionCategoryService.getPromotionCount(id, companyId),
    };
  }
}