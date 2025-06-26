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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IdentityVerificationService } from './identity-verification.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { Express } from 'express';

@Controller('api/id-verification')
export class IdentityVerificationController {
  constructor(
    private readonly identityService: IdentityVerificationService,
  ) {}

  // ✅ 上傳身分驗證圖片
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 3)) // 限制最多3張圖
  async uploadVerification(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request
  ) {
    console.log('📥 進入 uploadVerification');

    const userId = (req as any).user?.userId;
    console.log('🧾 取得 userId:', userId);

    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    if (!files || files.length !== 3) {
      console.log('⚠️ 檔案數量錯誤，實際收到:', files?.length);
      throw new HttpException('請上傳 3 張圖片', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.identityService.saveVerificationFiles(userId, files);
      console.log('✅ 上傳成功');
      return {
        status: 'pending',
        message: '身份驗證圖片已成功上傳，請耐心等待審核。',
      };
    } catch (error) {
      console.error('❌ 上傳處理失敗：', error);
      throw new InternalServerErrorException('Server error');
    }
  }

  // ✅ 查詢目前使用者的驗證紀錄
  @UseGuards(JwtAuthGuard)
@Get('me')
async getMyVerification(@Req() req: Request) {
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
  }

  const record = await this.identityService.findByUserId(userId);
  if (!record) {
    throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
  }

  return record;
}


  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteMyVerification(@Req() req: Request) {
    const userId = (req as any).user?.userId;
    if (!userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    try {
      return await this.identityService.deleteVerificationByUserId(userId);
    } catch (err) {
      console.error('❌ 刪除驗證資料失敗：', err);
      throw new InternalServerErrorException('刪除失敗');
    }
  }
}
