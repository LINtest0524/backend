import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Req,
  ParseIntPipe,
  BadRequestException
} from '@nestjs/common';
import { Request } from 'express';
import { MessageService, CreateMessageDto, MessageListQuery } from './message.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/portal/messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // 獲取消息列表
  @Get()
  async getMessages(@Req() req: Request, @Query() query: MessageListQuery) {
    const user = req.user as any;
    return await this.messageService.getMessages(user.id, user.company_id, query);
  }

  // 獲取未讀消息數量
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const user = req.user as any;
    const count = await this.messageService.getUnreadCount(user.id, user.company_id);
    return { count };
  }

  // 批量標記為已讀
  @Put('batch/read')
  async markMultipleAsRead(@Body('messageIds') messageIds: number[], @Req() req: Request) {
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new BadRequestException('messageIds 必須是非空數組');
    }
    
    const user = req.user as any;
    await this.messageService.markMultipleAsRead(messageIds, user.id, user.company_id);
    return { success: true };
  }

  // 批量刪除消息
  @Delete('batch')
  async deleteMultipleMessages(@Body('messageIds') messageIds: number[], @Req() req: Request) {
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new BadRequestException('messageIds 必須是非空數組');
    }
    
    const user = req.user as any;
    await this.messageService.deleteMultipleMessages(messageIds, user.id, user.company_id);
    return { success: true };
  }

  // 獲取單個消息詳情
  @Get(':id')
  async getMessageById(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    return await this.messageService.getMessageById(id, user.id, user.company_id);
  }

  // 標記消息為已讀
  @Put(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    return await this.messageService.markAsRead(id, user.id, user.company_id);
  }

  // 刪除消息
  @Delete(':id')
  async deleteMessage(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    await this.messageService.deleteMessage(id, user.id, user.company_id);
    return { success: true };
  }
}

// 管理員專用的消息控制器
@Controller('api/admin/messages')
@UseGuards(JwtAuthGuard)
export class AdminMessageController {
  constructor(private readonly messageService: MessageService) {}

  // 管理員獲取所有消息列表
  @Get()
  async getAllMessages(@Req() req: Request, @Query() query: MessageListQuery & { messageType?: string; isRead?: string }) {
    const user = req.user as any;
    
    // 檢查是否有管理員權限
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限查看消息');
    }

    // 轉換 isRead 參數
    const processedQuery = {
      ...query,
      isRead: query.isRead === 'true' ? true : query.isRead === 'false' ? false : undefined
    };

    return await this.messageService.getAllMessages(user.company_id, processedQuery);
  }

  // 管理員發送消息給特定用戶
  @Post('send')
  async sendMessage(@Body() createMessageDto: CreateMessageDto, @Req() req: Request) {
    const user = req.user as any;
    
    // 檢查是否有管理員權限
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限發送消息');
    }

    return await this.messageService.sendAdminMessage(user.id, user.company_id, createMessageDto);
  }

  // 發送系統廣播消息
  @Post('system-broadcast')
  async sendSystemMessage(@Body() body: { title: string; content: string }, @Req() req: Request) {
    const user = req.user as any;
    
    // 客服人員、代理商老闆、超級管理員可以發送系統廣播
    if (!['AGENT_SUPPORT', 'AGENT_OWNER', 'SUPER_ADMIN'].includes(user.role)) {
      throw new BadRequestException('沒有權限發送系統廣播');
    }

    if (!body.title || !body.content) {
      throw new BadRequestException('標題和內容不能為空');
    }

    try {
      await this.messageService.sendSystemMessageToAll(user.company_id, body.title, body.content);
      return { 
        success: true, 
        message: '系統廣播發送成功' 
      };
    } catch (error) {
      console.error('系統廣播發送失敗:', error);
      throw new BadRequestException('系統廣播發送失敗');
    }
  }
}