import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { NewsService } from '../news/news.service';
import { NewsQueryDto } from '../news/dto/news-query.dto';

@Controller('portal/news')
export class PortalNewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async getPublicNews(@Query('company') companyCode: string, @Query() query: NewsQueryDto) {
    if (!companyCode) {
      throw new NotFoundException('Company code is required');
    }

    // 這裡需要根據 companyCode 獲取 companyId
    // 假設有一個服務可以根據 code 獲取 company
    const companyId = await this.getCompanyIdByCode(companyCode);
    
    return this.newsService.findPublicNews(companyId, query);
  }

  @Get(':id')
  async getNewsDetail(
    @Param('id', ParseIntPipe) id: number,
    @Query('company') companyCode: string,
  ) {
    console.log(`getNewsDetail 被調用 - newsId: ${id}, company: ${companyCode}`);
    
    if (!companyCode) {
      throw new NotFoundException('Company code is required');
    }

    const news = await this.newsService.findOne(id);
    
    // 檢查新聞是否屬於指定公司且為公開status
    const companyId = await this.getCompanyIdByCode(companyCode);
    if (news.companyId !== companyId || news.status !== 'ACTIVE') {
      throw new NotFoundException('News not found');
    }

    // 增加瀏覽次數
    console.log(`增加瀏覽次數前: ${news.view_count}`);
    await this.newsService.incrementViewCount(id);
    
    // 重新獲取新聞資料以取得更新後的瀏覽次數
    const updatedNews = await this.newsService.findOne(id);
    console.log(`增加瀏覽次數後: ${updatedNews.view_count}`);

    // 獲取相關新聞和上下篇
    const [relatedNews, prevNext] = await Promise.all([
      this.newsService.getRelatedNews(id, companyId),
      this.newsService.getPrevNext(id, companyId),
    ]);

    return {
      news: updatedNews,
      relatedNews,
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