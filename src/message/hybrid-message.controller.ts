import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  Request,
  ParseIntPipe
} from '@nestjs/common';
import { HybridMessageService, CreateBroadcastDto, CreatePersonalMessageDto } from './hybrid-message.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class HybridMessageController {
  constructor(private readonly messageService: HybridMessageService) {}

  // ==================== 會員端 API ====================

  /**
   * 獲取會員的所有訊息（廣播 + 個人）
   */
  @Get('my-messages')
  async getMyMessages(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ) {
    const { userId, companyId } = req.user;
    
    const result = await this.messageService.getUserMessages(
      userId, 
      companyId, 
      Number(page), 
      Number(limit)
    );

    return {
      success: true,
      data: result,
      message: '訊息列表獲取成功'
    };
  }

  /**
   * 獲取未讀廣播
   */
  @Get('unread-broadcasts')
  async getUnreadBroadcasts(@Request() req) {
    const { userId, companyId } = req.user;
    
    const broadcasts = await this.messageService.getUnreadBroadcasts(userId, companyId);
    
    return {
      success: true,
      data: broadcasts,
      count: broadcasts.length,
      message: '未讀廣播獲取成功'
    };
  }

  /**
   * 標記廣播為已讀
   */
  @Put('broadcasts/mark-read')
  async markBroadcastsAsRead(@Request() req) {
    const { userId, companyId } = req.user;
    
    await this.messageService.markBroadcastsAsChecked(userId, companyId);
    
    return {
      success: true,
      message: '廣播已標記為已讀'
    };
  }

  /**
   * 獲取個人訊息
   */
  @Get('personal')
  async getPersonalMessages(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ) {
    const { userId, companyId } = req.user;
    
    const result = await this.messageService.getPersonalMessages(
      userId, 
      companyId, 
      Number(page), 
      Number(limit)
    );

    return {
      success: true,
      data: result,
      message: '個人訊息獲取成功'
    };
  }

  /**
   * 標記個人訊息為已讀
   */
  @Put('personal/:id/read')
  async markPersonalMessageAsRead(
    @Param('id', ParseIntPipe) messageId: number,
    @Request() req
  ) {
    const { userId } = req.user;
    
    await this.messageService.markPersonalMessageAsRead(messageId, userId);
    
    return {
      success: true,
      message: '訊息已標記為已讀'
    };
  }

  /**
   * 發送個人訊息（會員對會員，如果允許的話）
   */
  @Post('personal')
  async sendPersonalMessage(
    @Body() createMessageDto: CreatePersonalMessageDto,
    @Request() req
  ) {
    const { userId, companyId } = req.user;
    
    const message = await this.messageService.createPersonalMessage(
      userId,
      companyId,
      createMessageDto
    );

    return {
      success: true,
      data: message,
      message: '訊息發送成功'
    };
  }

  // ==================== 管理員端 API ====================

  /**
   * 發送系統廣播（僅管理員）
   */
  @Post('broadcasts')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN', 'SUPER_ADMIN', 'AGENT_OWNER')
  async createBroadcast(
    @Body() createBroadcastDto: CreateBroadcastDto,
    @Request() req
  ) {
    const { userId, companyId } = req.user;
    
    const broadcast = await this.messageService.createBroadcast(
      userId,
      companyId,
      createBroadcastDto
    );

    return {
      success: true,
      data: broadcast,
      message: '系統廣播發送成功'
    };
  }

  /**
   * 獲取所有廣播列表（僅管理員）
   */
  @Get('broadcasts')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN', 'SUPER_ADMIN', 'AGENT_OWNER')
  async getAllBroadcasts(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ) {
    const { companyId } = req.user;
    
    const result = await this.messageService.getAllBroadcasts(
      companyId,
      Number(page),
      Number(limit)
    );

    return {
      success: true,
      data: result,
      message: '廣播列表獲取成功'
    };
  }

  /**
   * 獲取廣播統計（僅管理員）
   */
  @Get('broadcasts/:id/stats')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN', 'SUPER_ADMIN', 'AGENT_OWNER')
  async getBroadcastStats(@Param('id', ParseIntPipe) broadcastId: number) {
    const stats = await this.messageService.getBroadcastStats(broadcastId);
    
    return {
      success: true,
      data: stats,
      message: '廣播統計獲取成功'
    };
  }

  /**
   * 停用廣播（僅管理員）
   */
  @Put('broadcasts/:id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN', 'SUPER_ADMIN', 'AGENT_OWNER')
  async deactivateBroadcast(
    @Param('id', ParseIntPipe) broadcastId: number,
    @Request() req
  ) {
    const { companyId } = req.user;
    
    await this.messageService.deactivateBroadcast(broadcastId, companyId);
    
    return {
      success: true,
      message: '廣播已停用'
    };
  }

  /**
   * 發送個人訊息給指定會員（僅管理員）
   */
  @Post('personal/admin-send')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN', 'SUPER_ADMIN', 'AGENT_OWNER')
  async adminSendPersonalMessage(
    @Body() createMessageDto: CreatePersonalMessageDto,
    @Request() req
  ) {
    const { userId, companyId } = req.user;
    
    const message = await this.messageService.createPersonalMessage(
      userId,
      companyId,
      createMessageDto
    );

    return {
      success: true,
      data: message,
      message: '個人訊息發送成功'
    };
  }

  // ==================== 系統功能 ====================

  /**
   * 更新會員登入時間（通常在登入時自動調用）
   */
  @Post('update-login-time')
  async updateLoginTime(@Request() req) {
    const { userId, companyId } = req.user;
    
    await this.messageService.updateUserLoginTime(userId, companyId);
    
    return {
      success: true,
      message: '登入時間已更新'
    };
  }

  /**
   * 獲取訊息統計（會員端）
   */
  @Get('stats')
  async getMessageStats(@Request() req) {
    const { userId, companyId } = req.user;
    
    // 獲取未讀廣播數量
    const unreadBroadcasts = await this.messageService.getUnreadBroadcasts(userId, companyId);
    
    // 獲取未讀個人訊息數量
    const personalResult = await this.messageService.getPersonalMessages(userId, companyId, 1, 1);
    
    return {
      success: true,
      data: {
        unreadBroadcastCount: unreadBroadcasts.length,
        unreadPersonalCount: personalResult.unreadCount,
        totalUnreadCount: unreadBroadcasts.length + personalResult.unreadCount
      },
      message: '訊息統計獲取成功'
    };
  }
}