import { Controller, Get, Post, Put, Delete, Body, Param, UploadedFile, UseInterceptors, ParseIntPipe } from "@nestjs/common";
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { Express } from 'express';
import { LuckyPrizeService } from "./lucky-prize.service";

@Controller("lucky-prize")
export class LuckyPrizeController {
  constructor(private readonly service: LuckyPrizeService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body) {
    return this.service.create(body);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads/luckydraw',
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
  uploadPrizeImage(@UploadedFile() file: Express.Multer.File) {
    const url = `/uploads/luckydraw/${file.filename}`;
    return { url };
  }
}
