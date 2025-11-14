import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RequirePermission } from '../auth/permission.decorator';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @RequirePermission('news.create')
  @Post()
  create(@Body() createNewsDto: CreateNewsDto, @Request() req) {
    // 如果不是SUPER_ADMIN，只能管理自己公司的新聞
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      createNewsDto.companyId = req.user.companyId;
    }
    return this.newsService.create(createNewsDto);
  }

  @RequirePermission('news.view')
  @Get('admin/company/:companyId')
  findByCompany(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query() query: NewsQueryDto,
    @Request() req,
  ) {
    // Permission檢查
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'GLOBAL_ADMIN') {
      if (req.user.companyId !== companyId) {
        throw new UnauthorizedException('您只能查看自己公司的新聞');
      }
    }
    return this.newsService.findByCompany(companyId, query);
  }

  @RequirePermission('news.view')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.newsService.findOne(id);
  }

  @RequirePermission('news.edit')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNewsDto: UpdateNewsDto,
    @Request() req,
  ) {
    // TODO: 添加權限檢查，確保只能編輯自己公司的新聞
    return this.newsService.update(id, updateNewsDto);
  }

  @RequirePermission('news.delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    // TODO: 添加權限檢查，確保只能刪除自己公司的新聞
    return this.newsService.remove(id);
  }

  @RequirePermission('news.create')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads/news',
        filename: (req, file, cb) => {
          const uniqueSuffix = uuidv4();
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      url: `/uploads/news/${file.filename}`,
    };
  }
}