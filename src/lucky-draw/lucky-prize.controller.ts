import { Controller, Get, Post, Put, Delete, Body, Param, UploadedFile, UseInterceptors, ParseIntPipe, Req, Res, Query } from "@nestjs/common";
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { Express, Request, Response } from 'express';
import { LuckyPrizeService } from "./lucky-prize.service";

@Controller("lucky-prize")
export class LuckyPrizeController {
  constructor(private readonly service: LuckyPrizeService) {}

  @Get()
  findAll(@Query('eventId') eventId?: number) {
    return this.service.findAll(eventId);
  }

  @Get('active-event')
  findByActiveEvent(@Query('companyId') companyId?: number) {
    return this.service.findByActiveEvent(companyId);
  }

  @Get('records')
  async getAllDrawRecords(
    @Query('companyId') companyId?: number,
    @Query('eventId') eventId?: number,
    @Query('username') username?: string,
    @Query('prizeName') prizeName?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number
  ) {
    return this.service.getAllDrawRecords({
      companyId,
      eventId,
      username,
      prizeName,
      createdFrom,
      createdTo,
      limit: limit || 20,
      page: page || 1
    });
  }

  @Get('export')
  async exportDrawRecords(
    @Res({ passthrough: false }) res: Response,
    @Query('companyId') companyId?: string,
    @Query('eventId') eventId?: string,
    @Query('username') username?: string,
    @Query('prizeName') prizeName?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('format') format?: string,
    @Query('token') token?: string
  ) {
    // 手動轉換數字參數
    const parsedCompanyId = companyId && !isNaN(Number(companyId)) ? Number(companyId) : undefined;
    const parsedEventId = eventId && !isNaN(Number(eventId)) ? Number(eventId) : undefined;

    await this.service.exportDrawRecords({
      companyId: parsedCompanyId,
      eventId: parsedEventId,
      username,
      prizeName,
      createdFrom,
      createdTo,
      format: format as 'csv' | 'xlsx'
    }, res);
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

  @Post('draw')
  async drawPrize(
    @Body() body: { userId?: number; companyId?: number },
    @Req() req: Request
  ) {
    const userIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    return this.service.drawPrize(body.userId, body.companyId, userIp, userAgent);
  }

  @Get('history/:userId')
  async getUserDrawHistory(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('companyId') companyId?: number
  ) {
    return this.service.getUserDrawHistory(userId, companyId);
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
