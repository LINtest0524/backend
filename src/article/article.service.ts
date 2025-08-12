import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions, Not, LessThan, MoreThan } from 'typeorm';
import { Article, ArticleStatus } from './article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleQueryDto } from './dto/article-query.dto';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
  ) {}

  async create(createArticleDto: CreateArticleDto): Promise<Article> {
    const article = this.articleRepository.create(createArticleDto);
    return await this.articleRepository.save(article);
  }

  async findAll(query: ArticleQueryDto, companyId?: number) {
    const { page = 1, limit = 10, search, status, categoryId, sortBy = 'publish_date', sortOrder = 'DESC', createdFrom, createdTo } = query;
    
    console.log('ArticleService.findAll - 查詢參數:', {
      page, limit, search, status, categoryId, sortBy, sortOrder, createdFrom, createdTo, companyId
    });
    
    const queryBuilder = this.articleRepository.createQueryBuilder('article')
      .leftJoinAndSelect('article.category', 'category');
    
    if (companyId) {
      queryBuilder.where('article.companyId = :companyId', { companyId });
    }
    
    if (search) {
      queryBuilder.andWhere(
        '(article.title LIKE :search OR article.summary LIKE :search OR article.content LIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    if (status) {
      queryBuilder.andWhere('article.status = :status', { status });
    }
    
    if (categoryId) {
      queryBuilder.andWhere('article.categoryId = :categoryId', { categoryId });
    }
    
    // 日期篩選
    if (createdFrom) {
      queryBuilder.andWhere('article.publish_date >= :createdFrom', { createdFrom });
    }
    
    if (createdTo) {
      queryBuilder.andWhere('article.publish_date <= :createdTo', { createdTo });
    }
    
    // 置頂文章優先排序
    queryBuilder.orderBy('article.is_featured', 'DESC');
    
    // 次要排序
    if (sortBy === 'publish_date') {
      queryBuilder.addOrderBy('article.publish_date', sortOrder);
    } else if (sortBy === 'view_count') {
      queryBuilder.addOrderBy('article.view_count', sortOrder);
    } else if (sortBy === 'sort') {
      queryBuilder.addOrderBy('article.sort', sortOrder);
    } else {
      queryBuilder.addOrderBy('article.publish_date', 'DESC');
    }
    
    const total = await queryBuilder.getCount();
    const articles = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    
    return {
      data: articles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Article> {
    const article = await this.articleRepository.findOne({
      where: { id },
      relations: ['company', 'category'],
    });
    
    if (!article) {
      throw new NotFoundException(`文章 ID ${id} 不存在`);
    }
    
    return article;
  }

  async findByCompany(companyId: number, query: ArticleQueryDto) {
    return this.findAll(query, companyId);
  }

  async findPublicArticles(companyId: number, query: ArticleQueryDto) {
    console.log('findPublicArticles 被調用:', { companyId, query });
    const publicQuery = { ...query, status: ArticleStatus.ACTIVE };
    const result = await this.findAll(publicQuery, companyId);
    console.log('findPublicArticles 結果:', { 
      total: result.total, 
      page: result.page, 
      totalPages: result.totalPages,
      dataLength: result.data?.length 
    });
    return result;
  }

  async findByCategory(categoryId: number, companyId: number, query: ArticleQueryDto) {
    const categoryQuery = { ...query, categoryId, status: ArticleStatus.ACTIVE };
    return this.findAll(categoryQuery, companyId);
  }

  async update(id: number, updateArticleDto: UpdateArticleDto): Promise<Article> {
    const article = await this.findOne(id);
    Object.assign(article, updateArticleDto);
    return await this.articleRepository.save(article);
  }

  async remove(id: number): Promise<void> {
    const article = await this.findOne(id);
    await this.articleRepository.remove(article);
  }

  async incrementViewCount(id: number): Promise<void> {
    await this.articleRepository.increment({ id }, 'view_count', 1);
  }

  async getRelatedArticles(articleId: number, companyId: number, limit: number = 5): Promise<Article[]> {
    const currentArticle = await this.findOne(articleId);
    
    return await this.articleRepository.find({
      where: {
        companyId,
        status: ArticleStatus.ACTIVE,
        categoryId: currentArticle.categoryId,
        id: Not(articleId),
      },
      relations: ['category'],
      order: { publish_date: 'DESC' },
      take: limit,
    });
  }

  async getPrevNext(articleId: number, companyId: number) {
    const currentArticle = await this.findOne(articleId);
    
    const prev = await this.articleRepository.findOne({
      where: {
        companyId,
        status: ArticleStatus.ACTIVE,
        publish_date: LessThan(currentArticle.publish_date),
      },
      relations: ['category'],
      order: { publish_date: 'DESC' },
    });
    
    const next = await this.articleRepository.findOne({
      where: {
        companyId,
        status: ArticleStatus.ACTIVE,
        publish_date: MoreThan(currentArticle.publish_date),
      },
      relations: ['category'],
      order: { publish_date: 'ASC' },
    });
    
    return { prev, next };
  }
}