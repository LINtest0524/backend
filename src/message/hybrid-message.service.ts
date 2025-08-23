import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemBroadcast } from './system-broadcast.entity';
import { PersonalMessage } from './personal-message.entity';
import { UserLoginLog } from './user-login-log.entity';
import { AuditLog } from '../audit-log/audit-log.entity';

export interface CreateBroadcastDto {
  title: string;
  content: string;
  broadcastType?: 'GENERAL' | 'IMPORTANT' | 'MAINTENANCE' | 'NEW_MEMBER';
  targetAudience?: 'ALL' | 'VIP' | 'NEW_USERS';
  expiresAt?: Date;
  sendToNewMembers?: boolean;
  validDays?: number;
}

export interface CreatePersonalMessageDto {
  receiverId: number;
  title: string;
  content: string;
}

export interface MessageListResponse {
  broadcasts: SystemBroadcast[];
  personalMessages: PersonalMessage[];
  unreadBroadcastCount: number;
  unreadPersonalCount: number;
}

@Injectable()
export class HybridMessageService {
  constructor(
    @InjectRepository(SystemBroadcast)
    private broadcastRepository: Repository<SystemBroadcast>,
    
    @InjectRepository(PersonalMessage)
    private personalMessageRepository: Repository<PersonalMessage>,
    
    @InjectRepository(UserLoginLog)
    private userLoginLogRepository: Repository<UserLoginLog>,
    
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  // ==================== 系統廣播相關 ====================
  
  /**
   * 檢查用戶是否為新會員（根據審計日誌判斷）
   */
  private async isNewMember(userId: number, companyId: number): Promise<boolean> {
    // 查找該用戶的註冊記錄
    const registrationLog = await this.auditLogRepository
      .createQueryBuilder('audit')
      .where('audit.user_id = :userId', { userId })
      .andWhere('audit.action LIKE :action', { action: '%註冊後自動登入%' })
      .orderBy('audit.created_at', 'ASC')
      .getOne();

    if (!registrationLog) {
      // 如果沒有找到註冊記錄，回退到原來的邏輯
      const loginLog = await this.userLoginLogRepository.findOne({
        where: { userId, companyId }
      });
      return !loginLog || loginLog.lastBroadcastCheckAt.getTime() === 0;
    }

    // 檢查用戶是否已經標記過廣播為已讀
    const loginLog = await this.userLoginLogRepository.findOne({
      where: { userId, companyId }
    });

    // 如果沒有廣播檢查記錄，或者廣播檢查時間早於註冊時間，則認為是新會員
    if (!loginLog || loginLog.lastBroadcastCheckAt.getTime() === 0) {
      return true;
    }

    // 如果廣播檢查時間晚於註冊時間，說明已經看過廣播了
    return loginLog.lastBroadcastCheckAt < registrationLog.created_at;
  }
  
  /**
   * 發送系統廣播（管理員功能）
   */
  async createBroadcast(
    senderId: number,
    companyId: number,
    createBroadcastDto: CreateBroadcastDto
  ): Promise<SystemBroadcast> {
    // 根據廣播類型自動設定是否補發給新會員
    let sendToNewMembers = createBroadcastDto.sendToNewMembers;
    if (sendToNewMembers === undefined) {
      // 如果沒有明確指定，根據廣播類型自動判斷
      switch (createBroadcastDto.broadcastType) {
        case 'IMPORTANT':
        case 'MAINTENANCE':
        case 'NEW_MEMBER':
          sendToNewMembers = true;
          break;
        case 'GENERAL':
        default:
          sendToNewMembers = false;
          break;
      }
    }

    const broadcast = this.broadcastRepository.create({
      senderId,
      companyId,
      ...createBroadcastDto,
      sendToNewMembers,
    });

    return await this.broadcastRepository.save(broadcast);
  }

  /**
   * 獲取會員的未讀廣播
   */
  async getUnreadBroadcasts(userId: number, companyId: number): Promise<SystemBroadcast[]> {
    // 獲取會員最後檢查廣播的時間和已刪除的廣播ID
    const loginLog = await this.userLoginLogRepository.findOne({
      where: { userId, companyId }
    });

    // 使用新的新會員判斷邏輯
    const isNewMemberResult = await this.isNewMember(userId, companyId);
    const userRegistrationTime = loginLog?.lastLoginAt || new Date();
    
    // 解析已刪除的廣播ID列表
    let deletedBroadcastIds: number[] = [];
    try {
      deletedBroadcastIds = loginLog?.deletedBroadcastIds ? JSON.parse(loginLog.deletedBroadcastIds) : [];
    } catch (error) {
      console.error('解析已刪除廣播ID失敗:', error);
      deletedBroadcastIds = [];
    }
    
    let queryBuilder = this.broadcastRepository
      .createQueryBuilder('broadcast')
      .where('broadcast.companyId = :companyId', { companyId })
      .andWhere('broadcast.isActive = true')
      .andWhere('(broadcast.expiresAt IS NULL OR broadcast.expiresAt > NOW())');
    
    if (isNewMemberResult) {
      // 新會員邏輯：只接收標記為「補發給新會員」的廣播 + 新會員專屬廣播
      queryBuilder = queryBuilder.andWhere(
        '(broadcast.sendToNewMembers = true OR broadcast.broadcastType = :newMemberType)',
        { newMemberType: 'NEW_MEMBER' }
      );
      
      // 新會員還需要檢查有效天數限制（PostgreSQL 語法）
      queryBuilder = queryBuilder.andWhere(
        '(broadcast.validDays IS NULL OR EXTRACT(DAY FROM (NOW() - broadcast.createdAt)) <= broadcast.validDays)'
      );
    } else {
      // 現有會員邏輯：接收在最後檢查時間之後的廣播，但排除新會員專屬廣播
      const lastCheckTime = loginLog?.lastBroadcastCheckAt || new Date(0);
      queryBuilder = queryBuilder
        .andWhere('broadcast.createdAt > :lastCheckTime', { lastCheckTime })
        .andWhere('broadcast.broadcastType != :newMemberType', { newMemberType: 'NEW_MEMBER' });
    }
    
    // 排除已刪除的廣播
    if (deletedBroadcastIds.length > 0) {
      queryBuilder = queryBuilder.andWhere('broadcast.id NOT IN (:...deletedIds)', { deletedIds: deletedBroadcastIds });
    }
    
    const unreadBroadcasts = await queryBuilder
      .orderBy('broadcast.createdAt', 'DESC')
      .getMany();
    
    return unreadBroadcasts;
  }

  /**
   * 獲取所有廣播（會員查看，排除已刪除的）
   */
  async getAllBroadcasts(companyId: number, page = 1, limit = 20, userId?: number): Promise<{
    broadcasts: SystemBroadcast[];
    total: number;
    page: number;
    limit: number;
  }> {
    let deletedBroadcastIds: number[] = [];
    let isNewMember = false;
    
    // 如果提供了userId，則排除該用戶已刪除的廣播並判斷是否為新會員
    if (userId) {
      const loginLog = await this.userLoginLogRepository.findOne({
        where: { userId, companyId }
      });
      
      // 使用新的新會員判斷邏輯
      isNewMember = await this.isNewMember(userId, companyId);
      
      try {
        deletedBroadcastIds = loginLog?.deletedBroadcastIds ? JSON.parse(loginLog.deletedBroadcastIds) : [];
      } catch (error) {
        console.error('解析已刪除廣播ID失敗:', error);
        deletedBroadcastIds = [];
      }
    }

    let queryBuilder = this.broadcastRepository
      .createQueryBuilder('broadcast')
      .leftJoinAndSelect('broadcast.sender', 'sender')
      .where('broadcast.companyId = :companyId', { companyId })
      .andWhere('broadcast.isActive = true');

    // 根據會員類型過濾廣播
    if (userId) {
      if (isNewMember) {
        // 新會員：只顯示標記為「補發給新會員」的廣播 + 新會員專屬廣播
        queryBuilder = queryBuilder.andWhere(
          '(broadcast.sendToNewMembers = true OR broadcast.broadcastType = :newMemberType)',
          { newMemberType: 'NEW_MEMBER' }
        );
        
        // 新會員還需要檢查有效天數限制（PostgreSQL 語法）
        queryBuilder = queryBuilder.andWhere(
          '(broadcast.validDays IS NULL OR EXTRACT(DAY FROM (NOW() - broadcast.createdAt)) <= broadcast.validDays)'
        );
      } else {
        // 現有會員：排除新會員專屬廣播
        queryBuilder = queryBuilder.andWhere('broadcast.broadcastType != :newMemberType', { newMemberType: 'NEW_MEMBER' });
      }
    }

    // 排除已刪除的廣播
    if (deletedBroadcastIds.length > 0) {
      queryBuilder = queryBuilder.andWhere('broadcast.id NOT IN (:...deletedIds)', { deletedIds: deletedBroadcastIds });
    }

    const [broadcasts, total] = await queryBuilder
      .orderBy('broadcast.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { broadcasts, total, page, limit };
  }

  /**
   * 標記會員已檢查廣播
   */
  async markBroadcastsAsChecked(userId: number, companyId: number): Promise<void> {
    // 檢查是否已存在記錄
    const existingLog = await this.userLoginLogRepository.findOne({
      where: { userId, companyId }
    });

    if (existingLog) {
      // 更新現有記錄
      await this.userLoginLogRepository.update(
        { userId, companyId },
        { 
          lastBroadcastCheckAt: new Date(),
          lastLoginAt: new Date()
        }
      );
    } else {
      // 創建新記錄
      const newLog = this.userLoginLogRepository.create({
        userId,
        companyId,
        lastBroadcastCheckAt: new Date(),
        lastLoginAt: new Date(),
        deletedBroadcastIds: '[]'
      });
      await this.userLoginLogRepository.save(newLog);
    }
  }

  /**
   * 為會員刪除特定廣播
   */
  async deleteBroadcastForUser(userId: number, companyId: number, broadcastId: number): Promise<void> {
    // 檢查是否已存在記錄
    let existingLog = await this.userLoginLogRepository.findOne({
      where: { userId, companyId }
    });

    let deletedBroadcastIds: number[] = [];
    
    if (existingLog) {
      // 解析現有的已刪除廣播ID列表
      try {
        deletedBroadcastIds = existingLog.deletedBroadcastIds ? JSON.parse(existingLog.deletedBroadcastIds) : [];
      } catch (error) {
        console.error('解析已刪除廣播ID失敗:', error);
        deletedBroadcastIds = [];
      }
      
      // 添加新的廣播ID（如果還沒有的話）
      if (!deletedBroadcastIds.includes(broadcastId)) {
        deletedBroadcastIds.push(broadcastId);
      }
      
      // 更新記錄
      await this.userLoginLogRepository.update(
        { userId, companyId },
        { 
          deletedBroadcastIds: JSON.stringify(deletedBroadcastIds),
          lastBroadcastCheckAt: new Date(),
          lastLoginAt: new Date()
        }
      );
    } else {
      // 創建新記錄
      deletedBroadcastIds = [broadcastId];
      const newLog = this.userLoginLogRepository.create({
        userId,
        companyId,
        lastBroadcastCheckAt: new Date(),
        lastLoginAt: new Date(),
        deletedBroadcastIds: JSON.stringify(deletedBroadcastIds)
      });
      await this.userLoginLogRepository.save(newLog);
    }
    
    console.log(`✅ 用戶 ${userId} 已刪除廣播 ${broadcastId}，已刪除列表:`, deletedBroadcastIds);
  }

  // ==================== 個人訊息相關 ====================

  /**
   * 發送個人訊息
   */
  async createPersonalMessage(
    senderId: number,
    companyId: number,
    createMessageDto: CreatePersonalMessageDto
  ): Promise<PersonalMessage> {
    const message = this.personalMessageRepository.create({
      senderId,
      companyId,
      ...createMessageDto,
    });

    return await this.personalMessageRepository.save(message);
  }

  /**
   * 獲取會員的個人訊息
   */
  async getPersonalMessages(
    userId: number, 
    companyId: number, 
    page = 1, 
    limit = 20
  ): Promise<{
    messages: PersonalMessage[];
    total: number;
    unreadCount: number;
  }> {
    const [messages, total] = await this.personalMessageRepository.findAndCount({
      where: { 
        receiverId: userId, 
        companyId,
        isDeletedByReceiver: false 
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['sender']
    });

    const unreadCount = await this.personalMessageRepository.count({
      where: { 
        receiverId: userId, 
        companyId,
        isRead: false,
        isDeletedByReceiver: false 
      }
    });

    return { messages, total, unreadCount };
  }

  /**
   * 標記個人訊息為已讀
   */
  async markPersonalMessageAsRead(messageId: number, userId: number): Promise<void> {
    await this.personalMessageRepository.update(
      { id: messageId, receiverId: userId },
      { isRead: true, readAt: new Date() }
    );
  }

  // ==================== 綜合功能 ====================

  /**
   * 獲取會員的所有訊息（廣播 + 個人）
   */
  async getUserMessages(
    userId: number, 
    companyId: number,
    page = 1,
    limit = 20
  ): Promise<MessageListResponse> {
    // 獲取未讀廣播
    const broadcasts = await this.getUnreadBroadcasts(userId, companyId);
    
    // 獲取個人訊息
    const personalResult = await this.getPersonalMessages(userId, companyId, page, limit);

    return {
      broadcasts,
      personalMessages: personalResult.messages,
      unreadBroadcastCount: broadcasts.length,
      unreadPersonalCount: personalResult.unreadCount
    };
  }

  /**
   * 更新會員登入時間
   */
  async updateUserLoginTime(userId: number, companyId: number): Promise<void> {
    // 檢查是否已存在記錄
    const existingLog = await this.userLoginLogRepository.findOne({
      where: { userId, companyId }
    });

    if (existingLog) {
      // 如果已存在記錄，只更新登入時間，不更新廣播檢查時間
      await this.userLoginLogRepository.update(
        { userId, companyId },
        { lastLoginAt: new Date() }
      );
    } else {
      // 新會員：創建記錄但不設定 lastBroadcastCheckAt，讓他們能收到新會員廣播
      const newLog = this.userLoginLogRepository.create({
        userId,
        companyId,
        lastLoginAt: new Date(),
        lastBroadcastCheckAt: new Date(0), // 設定為很早的時間，確保能收到所有廣播
        deletedBroadcastIds: '[]'
      });
      await this.userLoginLogRepository.save(newLog);
    }
  }

  // ==================== 管理員功能 ====================

  /**
   * 獲取廣播統計
   */
  async getBroadcastStats(broadcastId: number): Promise<{
    broadcast: SystemBroadcast;
    targetUserCount: number;
    estimatedReachCount: number;
  }> {
    const broadcast = await this.broadcastRepository.findOne({
      where: { id: broadcastId },
      relations: ['sender']
    });

    if (!broadcast) {
      throw new Error('廣播不存在');
    }

    // 計算目標會員數（這裡可以根據 targetAudience 來計算）
    // 簡化版本：假設所有會員都是目標
    const targetUserCount = await this.userLoginLogRepository.count({
      where: { companyId: broadcast.companyId }
    });

    // 估算觸及數（已登入且在廣播發送後登入的會員）
    const estimatedReachCount = await this.userLoginLogRepository.count({
      where: { 
        companyId: broadcast.companyId,
        lastLoginAt: { $gte: broadcast.createdAt } as any
      }
    });

    return {
      broadcast,
      targetUserCount,
      estimatedReachCount
    };
  }

  /**
   * 停用廣播
   */
  async deactivateBroadcast(broadcastId: number, companyId: number): Promise<void> {
    await this.broadcastRepository.update(
      { id: broadcastId, companyId },
      { isActive: false }
    );
  }

  /**
   * 更新廣播內容
   */
  async updateBroadcast(broadcastId: number, companyId: number, updateData: { title: string; content: string }): Promise<void> {
    const result = await this.broadcastRepository.update(
      { id: broadcastId, companyId },
      { 
        title: updateData.title,
        content: updateData.content,
        updatedAt: new Date()
      }
    );

    if (result.affected === 0) {
      throw new Error('廣播不存在或無權限編輯');
    }
  }
}