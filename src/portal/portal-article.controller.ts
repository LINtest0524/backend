import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ArticleService } from '../article/article.service';
import { ArticleCategoryService } from '../article-category/article-category.service';
import { ArticleQueryDto } from '../article/dto/article-query.dto';

@Controller('portal/articles')
export class PortalArticleController {
  constructor(
    private readonly articleService: ArticleService,
    private readonly categoryService: ArticleCategoryService,
  ) {}

  @Get()
  async getPublicArticles(@Query('company') companyCode: string, @Query() query: ArticleQueryDto) {
    if (!companyCode) {
      throw new NotFoundException('Company code is required');
    }

    const companyId = await this.getCompanyIdByCode(companyCode);
    return this.articleService.findPublicArticles(companyId, query);
  }

  @Get('categories')
  async getPublicCategories(@Query('company') companyCode: string) {
    if (!companyCode) {
      throw new NotFoundException('Company code is required');
    }

    const companyId = await this.getCompanyIdByCode(companyCode);
    return this.categoryService.findActiveByCompany(companyId);
  }

  @Get('category/:slug')
  async getArticlesByCategory(
    @Param('slug') slug: string,
    @Query('company') companyCode: string,
    @Query() query: ArticleQueryDto,
  ) {
    if (!companyCode) {
      throw new NotFoundException('Company code is required');
    }

    const companyId = await this.getCompanyIdByCode(companyCode);
    const category = await this.categoryService.findBySlug(slug, companyId);
    
    return this.articleService.findByCategory(category.id, companyId, query);
  }

  @Get(':id')
  async getArticleDetail(
    @Param('id', ParseIntPipe) id: number,
    @Query('company') companyCode: string,
  ) {
    console.log(`getArticleDetail 被調用 - articleId: ${id}, company: ${companyCode}`);
    
    if (!companyCode) {
      throw new NotFoundException('Company code is required');
    }

    const article = await this.articleService.findOne(id);
    
    // 檢查文章是否屬於指定公司且為公開status
    const companyId = await this.getCompanyIdByCode(companyCode);
    if (article.companyId !== companyId || article.status !== 'ACTIVE') {
      throw new NotFoundException('Article not found');
    }

    // 增加瀏覽次數
    console.log(`增加瀏覽次數前: ${article.view_count}`);
    await this.articleService.incrementViewCount(id);
    
    // 重新獲取文章資料以取得更新後的瀏覽次數
    const updatedArticle = await this.articleService.findOne(id);
    console.log(`增加瀏覽次數後: ${updatedArticle.view_count}`);

    // 獲取相關文章和上下篇
    const [relatedArticles, prevNext] = await Promise.all([
      this.articleService.getRelatedArticles(id, companyId),
      this.articleService.getPrevNext(id, companyId),
    ]);

    return {
      article: updatedArticle,
      relatedArticles,
      ...prevNext,
    };
  }

  private async getCompanyIdByCode(companyCode: string): Promise<number> {
    // TODO: 實作根據 companyCode 獲取 companyId 的邏輯
    // 這裡暫時返回固定值，實際應該查詢 company 表
    const companyMap: { [key: string]: number } = {
      'a': 1,
      'b': 2,
    };
    
    const companyId = companyMap[companyCode];
    if (!companyId) {
      throw new NotFoundException('Company not found');
    }
    
    return companyId;
  }
}