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
  UnauthorizedException,
} from '@nestjs/common';
import { ArticleCategoryService } from './article-category.service';
import { CreateArticleCategoryDto } from './dto/create-article-category.dto';
import { UpdateArticleCategoryDto } from './dto/update-article-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('article-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ArticleCategoryController {
  constructor(private readonly categoryService: ArticleCategoryService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  create(@Body() createCategoryDto: CreateArticleCategoryDto, @Request() req) {
    // 如果不是SUPER_ADMIN，只能管理自己公司的分類
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      createCategoryDto.companyId = req.user.companyId;
    }
    return this.categoryService.create(createCategoryDto);
  }

  @Get('company/:companyId')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  findByCompany(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Request() req,
  ) {
    // Permission檢查
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      if (req.user.companyId !== companyId) {
        throw new UnauthorizedException('您只能查看自己公司的分類');
      }
    }
    return this.categoryService.findByCompany(companyId);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateArticleCategoryDto,
    @Request() req,
  ) {
    // TODO: 添加權限檢查，確保只能編輯自己公司的分類
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    // TODO: 添加權限檢查，確保只能刪除自己公司的分類
    return this.categoryService.remove(id);
  }
}