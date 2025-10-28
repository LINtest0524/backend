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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ContactInfoService } from './contact-info.service';
import { CreateContactInfoDto } from './dto/create-contact-info.dto';
import { UpdateContactInfoDto } from './dto/update-contact-info.dto';
import { v4 as uuidv4 } from 'uuid';

@Controller('contact-info')
export class ContactInfoController {
  constructor(private readonly contactInfoService: ContactInfoService) {}

  // 公開API端點，不需要身份驗證
  @Get('public/active')
  async findActivePublic(@Query('company') companyCode: string) {
    if (!companyCode) {
      return [];
    }
    return this.contactInfoService.findActiveByCompanyCode(companyCode);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'icon', maxCount: 1 },
      { name: 'qrCode', maxCount: 1 },
    ], {
      storage: diskStorage({
        destination: './public/uploads/contact-info',
        filename: (req, file, cb) => {
          const uniqueSuffix = uuidv4();
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          return cb(new BadRequestException('只允許上傳圖片文件 (JPG, PNG, GIF, WEBP, SVG)'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async create(
    @Body() createContactInfoDto: CreateContactInfoDto,
    @UploadedFiles() files: { icon?: Express.Multer.File[]; qrCode?: Express.Multer.File[] },
    @Request() req,
  ) {
    const dto = { ...createContactInfoDto };

    // 處理 FormData 中的 boolean 值
    if (typeof dto.targetBlank === 'string') {
      dto.targetBlank = dto.targetBlank === 'true';
    }

    // 處理 FormData 中的 number 值
    if (typeof dto.sortOrder === 'string') {
      dto.sortOrder = parseInt(dto.sortOrder, 10) || 0;
    }

    if (files.icon && files.icon[0]) {
      dto.icon = `/uploads/contact-info/${files.icon[0].filename}`;
    }

    if (files.qrCode && files.qrCode[0]) {
      dto.qrCode = `/uploads/contact-info/${files.qrCode[0].filename}`;
    }

    return this.contactInfoService.create(dto, req.user.companyId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  @Get()
  async findAll(@Request() req) {
    return this.contactInfoService.findAllByCompany(req.user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('active')
  async findActive(@Request() req) {
    return this.contactInfoService.findActiveByCompany(req.user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contactInfoService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'icon', maxCount: 1 },
      { name: 'qrCode', maxCount: 1 },
    ], {
      storage: diskStorage({
        destination: './public/uploads/contact-info',
        filename: (req, file, cb) => {
          const uniqueSuffix = uuidv4();
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          return cb(new BadRequestException('只允許上傳圖片文件 (JPG, PNG, GIF, WEBP, SVG)'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateContactInfoDto: UpdateContactInfoDto,
    @UploadedFiles() files: { icon?: Express.Multer.File[]; qrCode?: Express.Multer.File[] },
  ) {
    const dto = { ...updateContactInfoDto };

    // 處理 FormData 中的 boolean 值
    if (typeof dto.targetBlank === 'string') {
      dto.targetBlank = dto.targetBlank === 'true';
    }

    // 處理 FormData 中的 number 值
    if (typeof dto.sortOrder === 'string') {
      dto.sortOrder = parseInt(dto.sortOrder, 10) || 0;
    }

    if (files.icon && files.icon[0]) {
      dto.icon = `/uploads/contact-info/${files.icon[0].filename}`;
    }

    if (files.qrCode && files.qrCode[0]) {
      dto.qrCode = `/uploads/contact-info/${files.qrCode[0].filename}`;
    }

    return this.contactInfoService.update(+id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.contactInfoService.remove(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3', 'AGENT_LEVEL_4', 'AGENT_SUPPORT')
  @Patch('sort/update')
  async updateSort(@Body() items: { id: number; sortOrder: number }[]) {
    return this.contactInfoService.updateSortOrder(items);
  }
}