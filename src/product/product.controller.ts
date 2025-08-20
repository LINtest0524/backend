import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { ProductVariantService } from './product-variant.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Product } from './product.entity';
import { UserService } from '../user/user.service';
import * as UAParser from 'ua-parser-js';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Controller('admin/product')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly productVariantService: ProductVariantService,
    private readonly userService: UserService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async create(@Body() dto: CreateProductDto, @Request() req): Promise<Product> {
    const fullUser = await this.userService.findById(req.user.id);
    const { ip, platform } = this.extractClientInfo(req);
    return this.productService.create(dto, fullUser, ip, platform);
  }

  @Post('upload-images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  @UseInterceptors(FilesInterceptor('images', 10, {
    storage: diskStorage({
      destination: './public/uploads/products',
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
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    const imageUrls = files.map(file => `/uploads/products/${file.filename}`);
    return { images: imageUrls };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async findAll(@Request() req, @Query() query: ProductQueryDto) {
    const user = req.user;
    return this.productService.findAll(user, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: number, @Request() req) {
    return this.productService.findOneSecured(id, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async update(@Param('id') id: number, @Body() dto: UpdateProductDto, @Request() req) {
    const { user } = req;
    const { ip, platform } = this.extractClientInfo(req);
    return this.productService.update(id, dto, user, ip, platform);
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async updateStock(
    @Param('id') id: number, 
    @Body('quantity') quantity: number, 
    @Request() req
  ) {
    return this.productService.updateStock(id, quantity, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async remove(@Param('id') id: number, @Request() req) {
    const { user } = req;
    const { ip, platform } = this.extractClientInfo(req);
    return this.productService.remove(id, user, ip, platform);
  }

  @Get('company/:companyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  async findByCompany(@Param('companyId') companyId: number, @Request() req) {
    return this.productService.findByCompany(companyId, req.user);
  }

  // === 產品變體相關 API ===
  
  @Get(':productId/variants')
  @UseGuards(JwtAuthGuard)
  async getProductVariants(@Param('productId') productId: number) {
    return this.productVariantService.findByProductId(productId);
  }

  @Post(':productId/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async createVariant(
    @Param('productId') productId: number,
    @Body() dto: Omit<CreateProductVariantDto, 'product_id'>
  ) {
    const createDto: CreateProductVariantDto = { ...dto, product_id: productId };
    return this.productVariantService.create(createDto);
  }

  @Get('variants/:variantId')
  @UseGuards(JwtAuthGuard)
  async getVariant(@Param('variantId') variantId: number) {
    return this.productVariantService.findOne(variantId);
  }

  @Patch('variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async updateVariant(
    @Param('variantId') variantId: number,
    @Body() dto: UpdateProductVariantDto
  ) {
    return this.productVariantService.update(variantId, dto);
  }

  @Delete('variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async removeVariant(@Param('variantId') variantId: number) {
    return this.productVariantService.remove(variantId);
  }

  @Patch('variants/:variantId/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER')
  async updateVariantStock(
    @Param('variantId') variantId: number,
    @Body('quantity') quantity: number
  ) {
    return this.productVariantService.updateStock(variantId, quantity);
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