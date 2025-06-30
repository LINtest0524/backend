import {
  Controller,
  Post,
  Get,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IdentityVerificationService } from './identity-verification.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { Express } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('api/id-verification')
export class IdentityVerificationController {
  constructor(private readonly identityService: IdentityVerificationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 3))
  async uploadVerification(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
    @Body() body: { type: 'ID_CARD' | 'BANK_ACCOUNT' }
  ) {
    const userId = (req as any).user?.userId;
    const { type } = body;

    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    if (!type) throw new HttpException('缺少 type', HttpStatus.BAD_REQUEST);

    if (type === 'ID_CARD' && files.length !== 3) {
      throw new HttpException('請上傳 3 張身份證圖片', HttpStatus.BAD_REQUEST);
    }
    if (type === 'BANK_ACCOUNT' && files.length !== 1) {
      throw new HttpException('請上傳 1 張銀行封面圖片', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.identityService.saveVerificationFiles(userId, files, type);
      return {
        status: 'pending',
        message: '驗證資料已成功上傳，請耐心等待審核。',
      };
    } catch (error) {
      console.error('❌ 上傳處理失敗：', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyVerification(
    @Req() req: Request,
    @Query('type') type: 'ID_CARD' | 'BANK_ACCOUNT'
  ) {
    const userId = (req as any).user?.userId;
    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const record = await this.identityService.getUserVerification(userId, type ?? 'ID_CARD');
    if (!record) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    return record;
  }


  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteMyVerification(
    @Req() req: Request,
    @Query('type') type: 'ID_CARD' | 'BANK_ACCOUNT' // ✅ 加這個
  ) {
    const userId = (req as any).user?.userId;
    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    try {
      return await this.identityService.deleteVerificationByUserId(userId, type ?? 'ID_CARD');
    } catch (err) {
      console.error('❌ 刪除驗證資料失敗：', err);
      throw new InternalServerErrorException('刪除失敗');
    }
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  @Get('admin')
  async findAllForAdmin(@Req() req: Request) {
    const currentUser = req.user as any;
    const companyId = currentUser?.companyId;
    return this.identityService.findAllForCompany(companyId);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT')
  @Post('admin/:id/review')
  async reviewVerification(
    @Param('id') id: number,
    @Req() req: Request,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; note?: string }
  ) {
    const reviewerId = (req as any).user?.userId;
    if (!reviewerId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    return this.identityService.review(id, reviewerId, body.status, body.note);
  }

}
