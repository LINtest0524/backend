import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions, Not, LessThan, MoreThan } from 'typeorm';
import { News, NewsStatus } from './news.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsQueryDto } from './dto/news-query.dto';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(News)
    private newsRepository: Repository<News>,
  ) {}

  async create(createNewsDto: CreateNewsDto): Promise<News> {
    const news = this.newsRepository.create(createNewsDto);
    return await this.newsRepository.save(news);
  }

  async findAll(query: NewsQueryDto, companyId?: number) {
    const { page = 1, limit = 10, search, status, category, sortBy = 'publish_date', sortOrder = 'DESC', createdFrom, createdTo } = query;
    
    console.log('NewsService.findAll - 查詢參數:', {
      page, limit, search, status, category, sortBy, sortOrder, createdFrom, createdTo, companyId
    });
    
    const queryBuilder = this.newsRepository.createQueryBuilder('news');
    
    if (companyId) {
      queryBuilder.where('news.companyId = :companyId', { companyId });
    }
    
    if (search) {
      queryBuilder.andWhere(
        '(news.title LIKE :search OR news.summary LIKE :search OR news.content LIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    if (status) {
      queryBuilder.andWhere('news.status = :status', { status });
    }
    
    if (category) {
      queryBuilder.andWhere('news.category = :category', { category });
    }
    
    // 日期篩選
    if (createdFrom) {
      queryBuilder.andWhere('news.publish_date >= :createdFrom', { createdFrom });
      console.log('添加 createdFrom 條件:', createdFrom);
    }
    
    if (createdTo) {
      queryBuilder.andWhere('news.publish_date <= :createdTo', { createdTo });
      console.log('添加 createdTo 條件:', createdTo);
    }
    
    // 置頂文章優先排序
    queryBuilder.orderBy('news.is_featured', 'DESC');
    
    // 次要排序
    if (sortBy === 'publish_date') {
      queryBuilder.addOrderBy('news.publish_date', sortOrder);
    } else if (sortBy === 'view_count') {
      queryBuilder.addOrderBy('news.view_count', sortOrder);
    } else if (sortBy === 'sort') {
      queryBuilder.addOrderBy('news.sort', sortOrder);
    } else {
      queryBuilder.addOrderBy('news.publish_date', 'DESC');
    }
    
    const total = await queryBuilder.getCount();
    const news = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    
    return {
      data: news,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<News> {
    const news = await this.newsRepository.findOne({
      where: { id },
      relations: ['company'],
    });
    
    if (!news) {
      throw new NotFoundException(`News with ID ${id} not found`);
    }
    
    return news;
  }

  async findByCompany(companyId: number, query: NewsQueryDto) {
    return this.findAll(query, companyId);
  }

  async findPublicNews(companyId: number, query: NewsQueryDto) {
    console.log('🔍 findPublicNews 被調用:', { companyId, query });
    const publicQuery = { ...query, status: NewsStatus.ACTIVE };
    const result = await this.findAll(publicQuery, companyId);
    console.log('📊 findPublicNews 結果:', { 
      total: result.total, 
      page: result.page, 
      totalPages: result.totalPages,
      dataLength: result.data?.length 
    });
    return result;
  }

  async update(id: number, updateNewsDto: UpdateNewsDto): Promise<News> {
    const news = await this.findOne(id);
    Object.assign(news, updateNewsDto);
    return await this.newsRepository.save(news);
  }

  async remove(id: number): Promise<void> {
    const news = await this.findOne(id);
    await this.newsRepository.remove(news);
  }

  async incrementViewCount(id: number): Promise<void> {
    await this.newsRepository.increment({ id }, 'view_count', 1);
  }

  async getRelatedNews(newsId: number, companyId: number, limit: number = 5): Promise<News[]> {
    const currentNews = await this.findOne(newsId);
    
    return await this.newsRepository.find({
      where: {
        companyId,
        status: NewsStatus.ACTIVE,
        category: currentNews.category,
        id: Not(newsId),
      },
      order: { publish_date: 'DESC' },
      take: limit,
    });
  }

  async getPrevNext(newsId: number, companyId: number) {
    const currentNews = await this.findOne(newsId);
    
    const prev = await this.newsRepository.findOne({
      where: {
        companyId,
        status: NewsStatus.ACTIVE,
        publish_date: LessThan(currentNews.publish_date),
      },
      order: { publish_date: 'DESC' },
    });
    
    const next = await this.newsRepository.findOne({
      where: {
        companyId,
        status: NewsStatus.ACTIVE,
        publish_date: MoreThan(currentNews.publish_date),
      },
      order: { publish_date: 'ASC' },
    });
    
    return { prev, next };
  }
}