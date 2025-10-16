import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CheckinService } from './checkin.service';

@Controller('api/public-checkin')
export class PublicCheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post('activities/:id/perform')
  @UseGuards(JwtAuthGuard)
  async performCheckin(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { userId: number },
    @Request() req: any,
  ) {
    // 嚴格檢查用戶認證
    if (!req.user) {
      throw new Error('用戶未認證');
    }
    
    // 安全檢查：只允許用戶為自己簽到，除非是管理員
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && req.user.id !== body.userId) {
      throw new Error('權限不足：只能為自己簽到');
    }
    
    // 檢查活動權限：確保活動屬於用戶的公司
    const userCompanyId = req.user.company_id;
    const activity = await this.checkinService.findActivityById(id);
    
    if (activity.companyId !== userCompanyId) {
      throw new Error('無權限訪問此活動');
    }
    
    const userInfo = {
      id: req.user.id,
      role: req.user.role,
      company_id: req.user.company_id,
      username: req.user.username
    };
    const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    
    try {
      const result = await this.checkinService.performCheckin(
        id, 
        body.userId, 
        userInfo,
        clientIp
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('activities/:id/status/:userId')
  @UseGuards(JwtAuthGuard)
  async getCheckinStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req: any,
  ) {
    // 嚴格檢查用戶認證
    if (!req.user) {
      throw new Error('用戶未認證');
    }
    
    // 安全檢查：只允許用戶查看自己的狀態，除非是管理員
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && req.user.id !== userId) {
      throw new Error('權限不足：只能查看自己的簽到狀態');
    }
    
    // 檢查活動權限：確保活動屬於用戶的公司
    const userCompanyId = req.user.company_id;
    const activity = await this.checkinService.findActivityById(id);
    
    if (activity.companyId !== userCompanyId) {
      throw new Error('無權限訪問此活動');
    }
    
    return this.checkinService.getCheckinStatus(id, userId);
  }

  @Get('activities')
  @UseGuards(JwtAuthGuard)
  async getAvailableActivities(@Request() req: any) {
    // 獲取用戶的公司ID
    const userCompanyId = req.user?.company_id || 1;
    
    // 只返回啟用的活動
    const activities = await this.checkinService.findActivitiesByCompany(userCompanyId, true);
    
    return {
      data: activities,
      total: activities.length
    };
  }

  @Get('activities/:id/rewards')
  @UseGuards(JwtAuthGuard)
  async getActivityRewards(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    // 驗證用戶是否有權限訪問該活動
    const userCompanyId = req.user?.company_id || 1;
    const activity = await this.checkinService.findActivityById(id);
    
    if (activity.companyId !== userCompanyId) {
      throw new Error('無權限訪問此活動');
    }
    
    return {
      id: activity.id,
      title: activity.title,
      dayRewards: activity.dayRewards
    };
  }

  // 新增：合併的狀態和獎勵配置 API
  @Get('activities/:id/status-with-rewards/:userId')
  @UseGuards(JwtAuthGuard)
  async getCheckinStatusWithRewards(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req: any,
  ) {
    // 嚴格檢查用戶認證
    if (!req.user) {
      throw new Error('用戶未認證');
    }
    
    // 安全檢查：只允許用戶查看自己的狀態，除非是管理員
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && req.user.id !== userId) {
      throw new Error('權限不足：只能查看自己的簽到狀態');
    }
    
    // 檢查活動權限：確保活動屬於用戶的公司
    const userCompanyId = req.user.company_id;
    const activity = await this.checkinService.findActivityById(id);
    
    if (activity.companyId !== userCompanyId) {
      throw new Error('無權限訪問此活動');
    }
    
    return this.checkinService.getCheckinStatusWithRewards(id, userId);
  }
}