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
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import * as UAParser from 'ua-parser-js';

import { FloatingAdService } from './floating-ad.service';
import { CreateFloatingAdDto } from './dto/create-floating-ad.dto';
import { UpdateFloatingAdDto } from './dto/update-floating-ad.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user/user.entity';
import { Express } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('floating-ads')
export class FloatingAdController {
  constructor(private readonly floatingAdService: FloatingAdService) {}

  @Get()
  findAll(@Req() req: any) {
    const user = req.user;
    return this.floatingAdService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const user = req.user;
    return this.floatingAdService.findOne(id, user.companyId);
  }

  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  @Post()
  async create(@Body() dto: CreateFloatingAdDto, @Req() req: any) {
    const user = req.user;
    const ip = req.ip;

    // 平台格式化
    const uaString = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(uaString);
    const info = parser.getResult();

    const deviceType = info.device.type ?? 'desktop';
    const device =
      deviceType === 'mobile' ? '手機' :
      deviceType === 'tablet' ? '平板' : '電腦';

    const os = `${info.os.name ?? ''} ${info.os.version ?? ''}`.trim();
    const browser = `${info.browser.name ?? ''} ${info.browser.version ?? ''}`.trim();
    const platform = `${device} / ${os} / ${browser}`;

    dto.company = { id: user.companyId };
    return this.floatingAdService.create(dto, user, ip, platform);
  }

  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFloatingAdDto,
    @Req() req: any
  ) {
    const user = req.user;
    const ip = req.ip;

    // 平台格式化
    const uaString = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(uaString);
    const info = parser.getResult();

    const deviceType = info.device.type ?? 'desktop';
    const device =
      deviceType === 'mobile' ? '手機' :
      deviceType === 'tablet' ? '平板' : '電腦';

    const os = `${info.os.name ?? ''} ${info.os.version ?? ''}`.trim();
    const browser = `${info.browser.name ?? ''} ${info.browser.version ?? ''}`.trim();
    const platform = `${device} / ${os} / ${browser}`;

    return this.floatingAdService.update(id, dto, user, ip, platform);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.GLOBAL_ADMIN, UserRole.AGENT_OWNER)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const user = req.user;
    const ip = req.ip;

    const uaString = req.headers['user-agent'] || '';
    const parser = new UAParser.UAParser(uaString);
    const info = parser.getResult();

    const deviceType = info.device.type ?? 'desktop';
    const device =
      deviceType === 'mobile' ? '手機' :
      deviceType === 'tablet' ? '平板' : '電腦';

    const os = `${info.os.name ?? ''} ${info.os.version ?? ''}`.trim();
    const browser = `${info.browser.name ?? ''} ${info.browser.version ?? ''}`.trim();
    const platform = `${device} / ${os} / ${browser}`;

    return this.floatingAdService.remove(id, user, ip, platform);
  }

  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GLOBAL_ADMIN,
    UserRole.AGENT_OWNER,
    UserRole.AGENT_SUPPORT
  )
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads/floating-ad',
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const filename = `${uuid()}${ext}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('只接受 jpg/png/webp/gif 圖片'), false);
        }
      },
    })
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    const url = `/uploads/floating-ad/${file.filename}`;
    return { url };
  }
}