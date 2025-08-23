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
import { MessageService, CreateMessageDto, MessageListQuery } from './message.service';
import { HybridMessageService, CreateBroadcastDto, CreatePersonalMessageDto } from './hybrid-message.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/portal/messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly hybridMessageService: HybridMessageService
  ) {}

  // 獲取消息列表（包含系統廣播和個人消息）
  @Get()
  async getMessages(@Req() req: Request, @Query() query: MessageListQuery) {
    const user = req.user as any;
    
    console.log('🔍 getMessages - 用戶資訊:', {
      id: user.id,
      username: user.username,
      company_id: user.company_id,
      companyId: user.companyId,
      company: user.company
    });
    
    // 使用 companyId（JWT 策略已經設定好）
    const companyId = user.companyId;
    if (!companyId) {
      console.error('🚨 無法獲取公司ID:', { user });
      throw new BadRequestException('無法獲取公司ID');
    }
    
    // 獲取未讀廣播
    const unreadBroadcasts = await this.hybridMessageService.getUnreadBroadcasts(user.id, companyId);
    
    // 獲取所有廣播（用於已讀列表，排除用戶已刪除的）
    const allBroadcastsResult = await this.hybridMessageService.getAllBroadcasts(companyId, 1, 1000, user.id);
    
    console.log('📢 廣播查詢結果:', {
      userId: user.id,
      companyId: companyId,
      unreadBroadcastCount: unreadBroadcasts.length,
      totalBroadcastCount: allBroadcastsResult.broadcasts.length,
      unreadBroadcasts: unreadBroadcasts.map(b => ({
        id: b.id,
        title: b.title,
        createdAt: b.createdAt
      })),
      allBroadcasts: allBroadcastsResult.broadcasts.map(b => ({
        id: b.id,
        title: b.title,
        createdAt: b.createdAt
      }))
    });
    
    // 獲取個人消息（新表）
    const personalResult = await this.hybridMessageService.getPersonalMessages(user.id, companyId, query.page || 1, query.limit || 20);
    
    // 獲取舊的消息表中的消息
    const oldMessagesResult = await this.messageService.getMessages(user.id, companyId, { page: 1, limit: 1000 });
    
    console.log('📨 個人消息查詢結果:', {
      userId: user.id,
      companyId: companyId,
      newPersonalMessageCount: personalResult.messages.length,
      oldMessageCount: oldMessagesResult.messages.length,
      unreadPersonalCount: personalResult.unreadCount,
      newPersonalMessages: personalResult.messages.map(msg => ({
        id: msg.id,
        title: msg.title,
        isRead: msg.isRead,
        createdAt: msg.createdAt
      })),
      oldMessages: oldMessagesResult.messages.map(msg => ({
        id: msg.id,
        title: msg.title,
        isRead: msg.isRead,
        messageType: msg.messageType,
        createdAt: msg.createdAt
      }))
    });

    // 創建未讀廣播ID集合
    const unreadBroadcastIds = new Set(unreadBroadcasts.map(b => b.id));

    // 轉換格式以符合前端期望
    const allMessages = [
      // 所有系統廣播（根據是否在未讀列表中判斷已讀狀態）
      ...allBroadcastsResult.broadcasts.map(broadcast => ({
        id: `broadcast_${broadcast.id}`,
        title: broadcast.title,
        content: broadcast.content,
        messageType: 'SYSTEM' as const,
        isRead: !unreadBroadcastIds.has(broadcast.id), // 不在未讀列表中就是已讀
        createdAt: broadcast.createdAt.toISOString(),
        sender: broadcast.sender ? {
          id: broadcast.sender.id,
          username: broadcast.sender.username
        } : undefined
      })),
      // 新的個人消息（personal_message 表）
      ...personalResult.messages.map(message => ({
        id: message.id,
        title: message.title,
        content: message.content,
        messageType: 'ADMIN' as const,
        isRead: message.isRead,
        createdAt: message.createdAt.toISOString(),
        readAt: message.readAt?.toISOString(),
        sender: message.sender ? {
          id: message.sender.id,
          username: message.sender.username
        } : undefined
      })),
      // 舊的消息（message 表）
      ...oldMessagesResult.messages.map(message => ({
        id: message.id,
        title: message.title,
        content: message.content,
        messageType: message.messageType,
        isRead: message.isRead,
        createdAt: message.createdAt.toISOString(),
        readAt: message.readAt?.toISOString(),
        sender: message.sender ? {
          id: message.sender.id,
          username: message.sender.username
        } : undefined
      }))
    ];

    // 按創建時間排序
    allMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log('🔄 合併後的消息列表:', {
      totalMessages: allMessages.length,
      broadcastMessages: allMessages.filter(m => m.messageType === 'SYSTEM').length,
      adminMessages: allMessages.filter(m => m.messageType === 'ADMIN').length,
      userMessages: allMessages.filter(m => m.messageType === 'USER').length,
      queryIsRead: query.isRead,
      allMessages: allMessages.map(m => ({
        id: m.id,
        title: m.title,
        messageType: m.messageType,
        isRead: m.isRead,
        createdAt: m.createdAt
      }))
    });

    // 應用篩選條件
    let filteredMessages = allMessages;
    if (query.isRead !== undefined) {
      // 確保 query.isRead 是布爾值
      const isReadFilter = String(query.isRead) === 'true';
      filteredMessages = allMessages.filter(msg => msg.isRead === isReadFilter);
      
      console.log('🔍 篩選後的消息:', {
        isReadFilter,
        originalCount: allMessages.length,
        filteredCount: filteredMessages.length
      });
    }

    // 應用分頁
    const page = query.page || 1;
    const limit = query.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

    console.log('📄 分頁結果:', {
      page,
      limit,
      startIndex,
      endIndex,
      paginatedCount: paginatedMessages.length,
      totalPages: Math.ceil(filteredMessages.length / limit)
    });

    return {
      messages: paginatedMessages,
      total: filteredMessages.length,
      page: page,
      limit: limit,
      totalPages: Math.ceil(filteredMessages.length / limit)
    };
  }

  // 獲取未讀消息數量
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const user = req.user as any;
    
    console.log('🔍 getUnreadCount - 用戶資訊:', {
      id: user.id,
      username: user.username,
      company_id: user.company_id,
      companyId: user.companyId,
      company: user.company
    });
    
    // 使用 companyId（JWT 策略已經設定好）
    const companyId = user.companyId;
    if (!companyId) {
      console.error('🚨 無法獲取公司ID:', { user });
      throw new BadRequestException('無法獲取公司ID');
    }
    
    // 獲取未讀廣播數量
    const unreadBroadcasts = await this.hybridMessageService.getUnreadBroadcasts(user.id, companyId);
    const unreadBroadcastCount = unreadBroadcasts.length;
    
    // 獲取未讀個人消息數量
    const personalResult = await this.hybridMessageService.getPersonalMessages(user.id, companyId, 1, 1000);
    const unreadPersonalCount = personalResult.unreadCount;
    
    const totalUnreadCount = unreadBroadcastCount + unreadPersonalCount;
    
    return { 
      count: totalUnreadCount,
      broadcastCount: unreadBroadcastCount,
      personalCount: unreadPersonalCount
    };
  }

  // 批量標記為已讀
  @Put('batch/read')
  async markMultipleAsRead(@Body('messageIds') messageIds: (number | string)[], @Req() req: Request) {
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new BadRequestException('messageIds 必須是非空數組');
    }
    
    const user = req.user as any;
    
    // 分離系統廣播和個人消息ID
    const broadcastIds: number[] = [];
    const personalMessageIds: number[] = [];
    
    messageIds.forEach(id => {
      if (typeof id === 'string' && id.startsWith('broadcast_')) {
        const broadcastId = parseInt(id.replace('broadcast_', ''));
        if (!isNaN(broadcastId)) {
          broadcastIds.push(broadcastId);
        }
      } else if (typeof id === 'number') {
        personalMessageIds.push(id);
      }
    });
    
    // 標記系統廣播為已讀
    if (broadcastIds.length > 0) {
      await this.hybridMessageService.markBroadcastsAsChecked(user.id, user.companyId);
    }
    
    // 標記個人消息為已讀
    if (personalMessageIds.length > 0) {
      await this.messageService.markMultipleAsRead(personalMessageIds, user.id, user.companyId);
    }
    
    return { success: true };
  }

  // 批量刪除消息
  @Delete('batch')
  async deleteMultipleMessages(@Body('messageIds') messageIds: (number | string)[], @Req() req: Request) {
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new BadRequestException('messageIds 必須是非空數組');
    }
    
    const user = req.user as any;
    
    // 分離系統廣播和個人消息ID
    const personalMessageIds: number[] = [];
    const broadcastIds: number[] = [];
    
    messageIds.forEach(id => {
      if (typeof id === 'string' && id.startsWith('broadcast_')) {
        // 系統廣播加入刪除列表
        const broadcastId = parseInt(id.replace('broadcast_', ''));
        if (!isNaN(broadcastId)) {
          broadcastIds.push(broadcastId);
        }
        console.log(`系統廣播 ${id} 將被刪除`);
      } else if (typeof id === 'number') {
        personalMessageIds.push(id);
      }
    });
    
    // 刪除系統廣播（加入已刪除列表）
    if (broadcastIds.length > 0) {
      for (const broadcastId of broadcastIds) {
        await this.hybridMessageService.deleteBroadcastForUser(user.id, user.companyId, broadcastId);
      }
    }
    
    // 刪除個人消息
    if (personalMessageIds.length > 0) {
      try {
        await this.messageService.deleteMultipleMessages(personalMessageIds, user.id, user.companyId);
        console.log('✅ 批量刪除舊消息表成功:', personalMessageIds);
      } catch (error) {
        console.log('⚠️ 批量刪除舊消息表失敗:', error);
        // 這裡可以添加新表的批量刪除邏輯
      }
    }
    
    // 返回適當的訊息
    if (broadcastIds.length > 0 && personalMessageIds.length > 0) {
      return { success: true, message: '消息已刪除' };
    } else if (broadcastIds.length > 0 && personalMessageIds.length === 0) {
      return { success: true, message: '系統廣播已刪除' };
    } else {
      return { success: true, message: '刪除成功' };
    }
  }

  // 獲取單個消息詳情
  @Get(':id')
  async getMessageById(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    
    // 檢查是否為系統廣播
    if (id.startsWith('broadcast_')) {
      const broadcastId = parseInt(id.replace('broadcast_', ''));
      if (isNaN(broadcastId)) {
        throw new BadRequestException('無效的廣播ID');
      }
      
      // 獲取廣播詳情（這裡需要實現獲取單個廣播的方法）
      const allBroadcasts = await this.hybridMessageService.getAllBroadcasts(user.companyId, 1, 1000);
      const broadcast = allBroadcasts.broadcasts.find(b => b.id === broadcastId);
      
      if (!broadcast) {
        throw new NotFoundException('廣播不存在');
      }
      
      return {
        id: `broadcast_${broadcast.id}`,
        title: broadcast.title,
        content: broadcast.content,
        messageType: 'SYSTEM',
        isRead: true, // 查看詳情時視為已讀
        createdAt: broadcast.createdAt.toISOString(),
        sender: broadcast.sender ? {
          id: broadcast.sender.id,
          username: broadcast.sender.username
        } : undefined
      };
    } else {
      // 個人消息
      const messageId = parseInt(id);
      if (isNaN(messageId)) {
        throw new BadRequestException('無效的消息ID');
      }
      return await this.messageService.getMessageById(messageId, user.id, user.companyId);
    }
  }

  // 標記消息為已讀
  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    
    // 檢查是否為系統廣播
    if (id.startsWith('broadcast_')) {
      // 標記系統廣播為已讀
      await this.hybridMessageService.markBroadcastsAsChecked(user.id, user.companyId);
      return { success: true, message: '系統廣播已標記為已讀' };
    } else {
      // 個人消息
      const messageId = parseInt(id);
      await this.hybridMessageService.markPersonalMessageAsRead(messageId, user.id);
      return { success: true, message: '個人消息已標記為已讀' };
    }
  }

  // 標記所有廣播為已讀
  @Put('broadcasts/read')
  async markAllBroadcastsAsRead(@Req() req: Request) {
    const user = req.user as any;
    await this.hybridMessageService.markBroadcastsAsChecked(user.id, user.companyId);
    return { success: true, message: '所有系統廣播已標記為已讀' };
  }

  // 調試用：獲取用戶廣播狀態
  @Get('debug/broadcast-status')
  async getBroadcastStatus(@Req() req: Request) {
    const user = req.user as any;
    
    // 獲取用戶登錄日誌
    const unreadBroadcasts = await this.hybridMessageService.getUnreadBroadcasts(user.id, user.companyId);
    const allBroadcasts = await this.hybridMessageService.getAllBroadcasts(user.companyId, 1, 100);
    
    return {
      userId: user.id,
      companyId: user.companyId,
      unreadBroadcastCount: unreadBroadcasts.length,
      totalBroadcastCount: allBroadcasts.total,
      unreadBroadcasts: unreadBroadcasts.map(b => ({
        id: b.id,
        title: b.title,
        createdAt: b.createdAt
      })),
      allBroadcasts: allBroadcasts.broadcasts.map(b => ({
        id: b.id,
        title: b.title,
        createdAt: b.createdAt,
        isActive: b.isActive
      }))
    };
  }

  // 刪除消息
  @Delete(':id')
  async deleteMessage(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    
    console.log('🔍 後端收到刪除請求:', { 
      messageId: id, 
      userId: user.id, 
      companyId: user.companyId,
      isBroadcast: id.startsWith('broadcast_')
    });
    
    // 檢查是否為系統廣播
    if (id.startsWith('broadcast_')) {
      console.log('📢 處理系統廣播刪除請求:', id);
      
      // 提取廣播ID
      const broadcastId = parseInt(id.replace('broadcast_', ''));
      if (isNaN(broadcastId)) {
        console.log('❌ 無效的廣播ID:', id);
        throw new BadRequestException('無效的廣播ID');
      }
      
      // 對於會員來說，刪除系統廣播就是將其加入已刪除列表
      await this.hybridMessageService.deleteBroadcastForUser(user.id, user.companyId, broadcastId);
      console.log(`🗑️ 系統廣播 ${id} 已從會員視圖中刪除`);
      
      const response = { success: true, message: '系統廣播已刪除' };
      console.log('📤 系統廣播響應:', response);
      return response;
    } else {
      console.log('💬 處理個人消息刪除請求:', id);
      // 個人消息可以刪除
      const messageId = parseInt(id);
      if (isNaN(messageId)) {
        console.log('❌ 無效的消息ID:', id);
        throw new BadRequestException('無效的消息ID');
      }
      
      try {
        // 先嘗試從舊的 message 表刪除
        await this.messageService.deleteMessage(messageId, user.id, user.companyId);
        console.log('✅ 舊消息表刪除成功:', messageId);
      } catch (error) {
        console.log('⚠️ 舊消息表中未找到，嘗試新表...');
        // 如果舊表中沒有，可能在新的 personal_message 表中
        // 這裡需要實現新表的刪除邏輯
        console.log('📝 需要實現新表刪除邏輯');
      }
      
      const response = { success: true };
      console.log('📤 個人消息響應:', response);
      return response;
    }
  }
}

// 管理員專用的消息控制器
@Controller('api/admin/messages')
@UseGuards(JwtAuthGuard)
export class AdminMessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly hybridMessageService: HybridMessageService
  ) {}

  // 管理員獲取所有消息列表
  @Get()
  async getAllMessages(@Req() req: Request, @Query() query: { page?: string; limit?: string; messageType?: string }) {
    const user = req.user as any;
    
    // 檢查是否有管理員權限
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限查看消息');
    }

    const page = parseInt(query.page || '1') || 1;
    const limit = parseInt(query.limit || '20') || 20;
    const messageType = query.messageType;

    if (messageType === 'SYSTEM') {
      // 只返回系統廣播
      const result = await this.hybridMessageService.getAllBroadcasts(user.companyId, page, limit);
      
      // 轉換格式以符合前端期望
      const messages = result.broadcasts.map(broadcast => ({
        id: broadcast.id,
        title: broadcast.title,
        content: broadcast.content,
        messageType: 'SYSTEM',
        senderId: broadcast.senderId,
        receiverId: null, // 系統廣播沒有特定接收者
        companyId: broadcast.companyId,
        isRead: null, // 系統廣播不需要已讀狀態
        createdAt: broadcast.createdAt,
        updatedAt: broadcast.updatedAt,
        readAt: null,
        sender: broadcast.sender,
        receiver: {
          id: 0,
          username: '所有會員',
          email: '系統廣播'
        }
      }));

      return {
        messages,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit)
      };
    } else if (!messageType || messageType === 'ALL') {
      // 返回所有類型的消息（系統廣播 + 管理員消息）
      
      // 獲取系統廣播
      const broadcastResult = await this.hybridMessageService.getAllBroadcasts(user.companyId, 1, 1000);
      const systemMessages = broadcastResult.broadcasts.map(broadcast => ({
        id: broadcast.id,
        title: broadcast.title,
        content: broadcast.content,
        messageType: 'SYSTEM',
        senderId: broadcast.senderId,
        receiverId: null,
        companyId: broadcast.companyId,
        isRead: null,
        createdAt: broadcast.createdAt,
        updatedAt: broadcast.updatedAt,
        readAt: null,
        sender: broadcast.sender,
        receiver: {
          id: 0,
          username: '所有會員',
          email: '系統廣播'
        }
      }));

      // 獲取管理員消息
      const adminMessagesResult = await this.messageService.getAllMessages(user.companyId, {
        page: 1,
        limit: 1000,
        messageType: 'ADMIN'
      });

      // 合併所有消息
      const allMessages = [...systemMessages, ...adminMessagesResult.messages];
      
      // 按創建時間排序
      allMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // 應用分頁
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMessages = allMessages.slice(startIndex, endIndex);

      return {
        messages: paginatedMessages,
        total: allMessages.length,
        page: page,
        limit: limit,
        totalPages: Math.ceil(allMessages.length / limit)
      };
    } else {
      // 其他特定類型的消息使用原有邏輯
      const processedQuery = {
        page,
        limit,
        messageType
      };
      return await this.messageService.getAllMessages(user.companyId, processedQuery);
    }
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

    return await this.messageService.sendAdminMessage(user.id, user.companyId, createMessageDto);
  }

  // 發送系統廣播消息
  @Post('system-broadcast')
  async sendSystemMessage(@Body() body: { title: string; content: string; broadcastType?: string; targetAudience?: string }, @Req() req: Request) {
    const user = req.user as any;
    
    // 客服人員、代理商老闆、超級管理員可以發送系統廣播
    if (!['AGENT_SUPPORT', 'AGENT_OWNER', 'SUPER_ADMIN'].includes(user.role)) {
      throw new BadRequestException('沒有權限發送系統廣播');
    }

    if (!body.title || !body.content) {
      throw new BadRequestException('標題和內容不能為空');
    }

    try {
      const createBroadcastDto: CreateBroadcastDto = {
        title: body.title,
        content: body.content,
        broadcastType: (body.broadcastType as any) || 'GENERAL',
        targetAudience: (body.targetAudience as any) || 'ALL'
      };

      await this.hybridMessageService.createBroadcast(user.id, user.companyId, createBroadcastDto);
      return { 
        success: true, 
        message: '系統廣播發送成功' 
      };
    } catch (error) {
      console.error('系統廣播發送失敗:', error);
      throw new BadRequestException('系統廣播發送失敗');
    }
  }

  // 管理員刪除消息
  @Delete(':id')
  async deleteMessage(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    
    // 檢查是否有管理員權限
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限刪除消息');
    }

    const messageId = parseInt(id);
    if (isNaN(messageId)) {
      throw new BadRequestException('無效的消息ID');
    }

    console.log('🔍 管理員刪除消息請求:', { 
      messageId, 
      userId: user.id, 
      companyId: user.companyId 
    });

    try {
      // 先嘗試刪除系統廣播
      await this.hybridMessageService.deactivateBroadcast(messageId, user.companyId);
      console.log('✅ 系統廣播已停用:', messageId);
      return { success: true, message: '系統廣播已刪除' };
    } catch (error) {
      console.log('⚠️ 不是系統廣播，嘗試刪除個人消息...');
      
      try {
        // 嘗試刪除個人消息（管理員版本）
        await this.messageService.adminDeleteMessage(messageId, user.companyId);
        console.log('✅ 個人消息已刪除:', messageId);
        return { success: true, message: '消息已刪除' };
      } catch (error) {
        console.error('❌ 刪除失敗:', error);
        throw new BadRequestException('刪除消息失敗');
      }
    }
  }

  // 管理員編輯系統廣播
  @Put(':id')
  async updateBroadcast(@Param('id') id: string, @Body() body: { title: string; content: string }, @Req() req: Request) {
    const user = req.user as any;
    
    // 檢查是否有管理員權限
    const allowedRoles = ['SUPER_ADMIN', 'GLOBAL_ADMIN', 'AGENT_OWNER', 'AGENT_SUPPORT'];
    if (!allowedRoles.includes(user.role)) {
      throw new BadRequestException('沒有權限編輯消息');
    }

    const broadcastId = parseInt(id);
    if (isNaN(broadcastId)) {
      throw new BadRequestException('無效的廣播ID');
    }

    if (!body.title || !body.content) {
      throw new BadRequestException('標題和內容不能為空');
    }

    console.log('🔍 管理員編輯廣播請求:', { 
      broadcastId, 
      userId: user.id, 
      companyId: user.companyId,
      title: body.title 
    });

    try {
      // 更新系統廣播
      await this.hybridMessageService.updateBroadcast(broadcastId, user.companyId, {
        title: body.title,
        content: body.content
      });
      
      console.log('✅ 系統廣播已更新:', broadcastId);
      return { success: true, message: '系統廣播已更新' };
    } catch (error) {
      console.error('❌ 更新失敗:', error);
      throw new BadRequestException('更新廣播失敗');
    }
  }
}