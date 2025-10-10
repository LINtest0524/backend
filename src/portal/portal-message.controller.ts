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
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { Request } from 'express';
import { MessageService } from '../message/message.service';
import { HybridMessageService, CreatePersonalMessageDto } from '../message/hybrid-message.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/portal/:companySlug/messages')
@UseGuards(JwtAuthGuard)
export class PortalMessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly hybridMessageService: HybridMessageService
  ) {}

  // 測試端點
  @Get('test')
  async testEndpoint(@Req() req: Request) {
    const user = req.user as any;
    return { 
      message: '測試成功', 
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        companyId: user.companyId,
        role: user.role
      }
    };
  }

  // 獲取消息列表（包含系統廣播和個人消息）
  @Get()
  async getMessages(@Req() req: Request, @Query() query: { page?: number; per_page?: number }) {
    const user = req.user as any;
    
    // 使用 companyId（JWT 策略已經設定好）
    const companyId = user.companyId;
    if (!companyId) {
      console.error('🚨 無法獲取公司ID:', { user });
      throw new BadRequestException('無法獲取公司ID');
    }
    
    try {
      // 獲取未讀廣播
      const unreadBroadcasts = await this.hybridMessageService.getUnreadBroadcasts(user.id, companyId);

      // 獲取所有廣播（包括已讀的，用於完整列表顯示）
      const allBroadcastsResult = await this.hybridMessageService.getAllBroadcasts(companyId, 1, 1000, user.id);
      
      // 同時記錄每個廣播的詳細信息用於調試

      // 特別記錄標籤群組廣播（已移除日誌）

      // 創建未讀廣播ID集合
      const unreadBroadcastIds = new Set(unreadBroadcasts.map(b => b.id));

      // 獲取個人消息
      const personalMessages = await this.hybridMessageService.getPersonalMessages(user.id, companyId, query.page || 1, query.per_page || 20);

      // 合併並排序消息
      const allMessages = [
        // 所有系統廣播（根據是否在未讀列表中判斷已讀狀態）
        ...allBroadcastsResult.broadcasts.map(broadcast => {
          const isRead = !unreadBroadcastIds.has(broadcast.id);
          return {
            id: `broadcast_${broadcast.id}`,
            type: 'broadcast' as const,
            title: broadcast.title,
            content: broadcast.content,
            created_at: broadcast.createdAt.toISOString(), // 修復時間格式
            is_read: isRead,
            priority: 'normal',
            original_id: broadcast.id,
            sender: broadcast.sender ? {
              id: broadcast.sender.id,
              username: broadcast.sender.username
            } : {
              id: 0,
              username: '系統管理員'
            }
          };
        }),
        ...personalMessages.messages.map(msg => ({
          id: `personal_${msg.id}`,
          type: 'personal' as const,
          title: msg.title,
          content: msg.content,
          created_at: msg.createdAt.toISOString(), // 修復時間格式
          is_read: msg.isRead,
          priority: 'normal',
          original_id: msg.id,
          sender: msg.sender ? {
            id: msg.sender.id,
            username: msg.sender.username
          } : {
            id: 0,
            username: '系統管理員'
          }
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const result = {
        messages: allMessages,
        total: allMessages.length,
        unread_count: allMessages.filter(msg => !msg.is_read).length,
        page: query.page || 1,
        per_page: query.per_page || 20
      };

      return {
        ...result,
        broadcasts: unreadBroadcasts.length,
        personal: personalMessages.messages.length
      };

    } catch (error) {
      console.error('❌ getMessages 錯誤:', error);
      throw new BadRequestException('獲取消息失敗: ' + error.message);
    }
  }

  // 標記消息為已讀
  @Put(':messageId/read')
  async markAsRead(
    @Param('messageId') messageId: string,
    @Req() req: Request
  ) {
    const user = req.user as any;

    try {
      // 解析消息類型和ID
      const [type, id] = messageId.split('_');
      const numericId = parseInt(id);

      if (type === 'broadcast') {
        await this.hybridMessageService.markSingleBroadcastAsRead(user.id, user.companyId, numericId);
      } else if (type === 'personal') {
        await this.hybridMessageService.markPersonalMessageAsRead(numericId, user.id, user.companyId);
      } else {
        throw new BadRequestException('無效的消息類型');
      }

      return { success: true, message: '消息已標記為已讀' };

    } catch (error) {
      console.error('❌ 標記已讀失敗:', error);
      throw new BadRequestException('標記已讀失敗: ' + error.message);
    }
  }

  // 獲取未讀消息數量
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const user = req.user as any;
    const companyId = user.companyId;

    if (!companyId) {
      throw new BadRequestException('無法獲取公司ID');
    }

    try {
      const unreadBroadcasts = await this.hybridMessageService.getUnreadBroadcasts(user.id, companyId);
      const personalResult = await this.hybridMessageService.getPersonalMessages(user.id, companyId, 1, 1000);
      const unreadPersonal = personalResult.unreadCount;

      const totalUnread = unreadBroadcasts.length + unreadPersonal;


      return {
        count: totalUnread,
        total: totalUnread,
        broadcasts: unreadBroadcasts.length,
        personal: unreadPersonal
      };

    } catch (error) {
      console.error('❌ 獲取未讀數量失敗:', error);
      throw new BadRequestException('獲取未讀數量失敗: ' + error.message);
    }
  }

  // 獲取消息詳情
  @Get(':messageId')
  async getMessageDetail(
    @Param('messageId') messageId: string,
    @Req() req: Request
  ) {
    const user = req.user as any;

    try {
      const [type, id] = messageId.split('_');
      const numericId = parseInt(id);

      if (type === 'broadcast') {
        // 從所有廣播中查找
        const allBroadcastsResult = await this.hybridMessageService.getAllBroadcasts(user.companyId, 1, 1000, user.id);
        const broadcast = allBroadcastsResult.broadcasts.find(b => b.id === numericId);
        
        if (!broadcast) {
          throw new NotFoundException('廣播消息不存在');
        }

        // 檢查是否已讀
        const unreadBroadcasts = await this.hybridMessageService.getUnreadBroadcasts(user.id, user.companyId);
        const isRead = !unreadBroadcasts.some(b => b.id === numericId);

        return {
          id: messageId,
          type: 'broadcast',
          title: broadcast.title,
          content: broadcast.content,
          created_at: broadcast.createdAt.toISOString(), // 修復時間格式
          is_read: isRead,
          priority: 'normal',
          sender: broadcast.sender ? {
            id: broadcast.sender.id,
            username: broadcast.sender.username
          } : {
            id: 0,
            username: '系統管理員'
          }
        };

      } else if (type === 'personal') {
        // 從個人消息中查找
        const personalResult = await this.hybridMessageService.getPersonalMessages(user.id, user.companyId, 1, 1000);
        const message = personalResult.messages.find(m => m.id === numericId);
        
        if (!message) {
          throw new NotFoundException('個人消息不存在');
        }

        return {
          id: messageId,
          type: 'personal',
          title: message.title,
          content: message.content,
          created_at: message.createdAt.toISOString(), // 修復時間格式
          is_read: message.isRead,
          priority: 'normal',
          sender: message.sender ? {
            id: message.sender.id,
            username: message.sender.username
          } : {
            id: 0,
            username: '系統管理員'
          }
        };

      } else {
        throw new BadRequestException('無效的消息類型');
      }

    } catch (error) {
      console.error('❌ 獲取消息詳情失敗:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('獲取消息詳情失敗: ' + error.message);
    }
  }

  // 批量刪除消息
  @Delete('batch')
  async batchDeleteMessages(
    @Body('messageIds') messageIds: (number | string)[],
    @Req() req: Request
  ) {
    const user = req.user as any;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new BadRequestException('messageIds 必須是非空數組');
    }


    try {
      let deletedBroadcasts = 0;
      let deletedPersonal = 0;

      for (const messageId of messageIds) {
        try {
          // 檢查消息ID格式
          if (typeof messageId === 'string' && messageId.startsWith('broadcast_')) {
            const broadcastId = parseInt(messageId.replace('broadcast_', ''));
            if (!isNaN(broadcastId)) {
              await this.hybridMessageService.deleteBroadcastForUser(user.id, user.companyId, broadcastId);
              deletedBroadcasts++;
            }
          } else if (typeof messageId === 'string' && messageId.startsWith('personal_')) {
            const personalId = parseInt(messageId.replace('personal_', ''));
            if (!isNaN(personalId)) {
              await this.hybridMessageService.deletePersonalMessage(personalId, user.id, user.companyId);
              deletedPersonal++;
            }
          } else if (typeof messageId === 'number') {
            // 兼容舊格式的數字ID（假設為個人消息）
            await this.hybridMessageService.deletePersonalMessage(messageId, user.id, user.companyId);
            deletedPersonal++;
          } else {
            console.warn('⚠️ 跳過無效消息ID:', messageId);
          }
        } catch (itemError) {
          console.error('❌ 刪除單個消息失敗:', messageId, itemError);
          // 繼續處理其他消息，不中斷整個批量操作
        }
      }

      // 返回適當的成功消息
      let message = '批量刪除完成';
      if (deletedBroadcasts > 0 && deletedPersonal > 0) {
        message = `已刪除 ${deletedBroadcasts} 條系統廣播和 ${deletedPersonal} 條個人消息`;
      } else if (deletedBroadcasts > 0) {
        message = `已刪除 ${deletedBroadcasts} 條系統廣播`;
      } else if (deletedPersonal > 0) {
        message = `已刪除 ${deletedPersonal} 條個人消息`;
      }


      return { 
        success: true, 
        message,
        deleted: {
          broadcasts: deletedBroadcasts,
          personal: deletedPersonal,
          total: deletedBroadcasts + deletedPersonal
        }
      };

    } catch (error) {
      console.error('❌ 批量刪除失敗:', error);
      throw new BadRequestException('批量刪除失敗: ' + error.message);
    }
  }

  // 批量標記為已讀
  @Put('batch/read')
  async batchMarkAsRead(
    @Body('messageIds') messageIds: (number | string)[],
    @Req() req: Request
  ) {
    const user = req.user as any;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new BadRequestException('messageIds 必須是非空數組');
    }


    try {
      let markedBroadcasts = 0;
      let markedPersonal = 0;

      for (const messageId of messageIds) {
        try {
          // 檢查消息ID格式
          if (typeof messageId === 'string' && messageId.startsWith('broadcast_')) {
            const broadcastId = parseInt(messageId.replace('broadcast_', ''));
            if (!isNaN(broadcastId)) {
              await this.hybridMessageService.markSingleBroadcastAsRead(user.id, user.companyId, broadcastId);
              markedBroadcasts++;
            }
          } else if (typeof messageId === 'string' && messageId.startsWith('personal_')) {
            const personalId = parseInt(messageId.replace('personal_', ''));
            if (!isNaN(personalId)) {
              await this.hybridMessageService.markPersonalMessageAsRead(personalId, user.id, user.companyId);
              markedPersonal++;
            }
          } else if (typeof messageId === 'number') {
            // 兼容舊格式的數字ID（假設為個人消息）
            await this.hybridMessageService.markPersonalMessageAsRead(messageId, user.id, user.companyId);
            markedPersonal++;
          } else {
            console.warn('⚠️ 跳過無效消息ID:', messageId);
          }
        } catch (itemError) {
          console.error('❌ 標記單個消息已讀失敗:', messageId, itemError);
          // 繼續處理其他消息，不中斷整個批量操作
        }
      }


      return { 
        success: true, 
        message: '批量標記已讀完成',
        marked: {
          broadcasts: markedBroadcasts,
          personal: markedPersonal,
          total: markedBroadcasts + markedPersonal
        }
      };

    } catch (error) {
      console.error('❌ 批量標記已讀失敗:', error);
      throw new BadRequestException('批量標記已讀失敗: ' + error.message);
    }
  }

  // 刪除消息
  @Delete(':messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Req() req: Request
  ) {
    const user = req.user as any;

    try {
      const [type, id] = messageId.split('_');
      const numericId = parseInt(id);

      if (type === 'broadcast') {
        // 對於廣播，將其添加到用戶的已刪除列表中
        await this.hybridMessageService.deleteBroadcastForUser(user.id, user.companyId, numericId);

        return { success: true, message: '廣播消息已刪除' };

      } else if (type === 'personal') {
        // 對於個人消息，軟刪除
        await this.hybridMessageService.deletePersonalMessage(numericId, user.id, user.companyId);

        return { success: true, message: '個人消息已刪除' };

      } else {
        throw new BadRequestException('無效的消息類型');
      }

    } catch (error) {
      console.error('❌ 刪除消息失敗:', error);
      throw new BadRequestException('刪除消息失敗: ' + error.message);
    }
  }
}