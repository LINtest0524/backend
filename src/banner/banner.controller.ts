import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/user.entity';
import { Express } from 'express';


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  findAll() {
    return this.bannerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bannerService.findOne(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENT_OWNER)
  @Post()
  create(@Body() dto: CreateBannerDto) {
    return this.bannerService.create(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENT_OWNER)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBannerDto) {
    return this.bannerService.update(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENT_OWNER)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bannerService.remove(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENT_OWNER)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads/banner',
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const filename = `${uuid()}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('只接受 jpg/png/webp 圖片'), false);
        }
      },
    })
  )
  uploadBannerImage(@UploadedFile() file: Express.Multer.File) {
    const url = `/uploads/banner/${file.filename}`;
    return { url };
    }
}
