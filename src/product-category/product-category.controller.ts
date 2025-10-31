import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductCategoryService } from './product-category.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProductCategory } from './product-category.entity';
import { UserService } from '../user/user.service';
import * as UAParser from 'ua-parser-js';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Controller('admin/product-category')
export class ProductCategoryController {
  constructor(
    private readonly categoryService: ProductCategoryService,
    private readonly userService: UserService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  async create(@Body() dto: CreateProductCategoryDto, @Request() req): Promise<ProductCategory> {
    const fullUser = await this.userService.findById(req.user.id);
    const { ip, platform } = this.extractClientInfo(req);
    return this.categoryService.create(dto, fullUser, ip, platform);
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './public/uploads/categories',
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new BadRequestException('只允許上傳圖片檔案'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    },
  }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return { imageUrl: `/uploads/categories/${file.filename}` };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  async findAll(@Request() req) {
    const { query, user } = req;
    return this.categoryService.findAllWithFilters(user, query);
  }

  @Get('tree')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  async findTree(@Request() req) {
    return this.categoryService.findTree(req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: number, @Request() req) {
    return this.categoryService.findOneSecured(id, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4')
  async update(@Param('id') id: number, @Body() dto: UpdateProductCategoryDto, @Request() req) {
    const { user } = req;
    const { ip, platform } = this.extractClientInfo(req);
    return this.categoryService.update(id, dto, user, ip, platform);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN')
  async remove(@Param('id') id: number, @Request() req) {
    const { user } = req;
    const { ip, platform } = this.extractClientInfo(req);
    return this.categoryService.remove(id, user, ip, platform);
  }

  @Get('company/:companyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  async findByCompany(@Param('companyId') companyId: number, @Request() req) {
    return this.categoryService.findByCompany(companyId, req.user);
  }

  private extractClientInfo(req: any) {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'unknown';
    const uaString = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(uaString);
    const info = parser.getResult();
    const device = info.device.type === 'mobile' ? '手機'
                 : info.device.type === 'tablet' ? '平板'
                 : '電腦';
    const os = `${info.os.name ?? ''} ${info.os.version ?? ''}`.trim();
    const browser = `${info.browser.name ?? ''} ${info.browser.version ?? ''}`.trim();
    const platform = `${device} / ${os} / ${browser}`;
    return { ip, platform };
  }
}