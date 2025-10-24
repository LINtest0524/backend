import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemBroadcast } from './system-broadcast.entity';
import { PersonalMessage } from './personal-message.entity';
import { UserLoginLog } from './user-login-log.entity';
import { AuditLog } from '../audit-log/audit-log.entity';
import { User, UserRole } from '../user/user.entity';
import { UserTag } from '../user/user-tag.entity';

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
    
    @InjectRepository(User)
    private userRepository: Repository<User>,
    
    @InjectRepository(UserTag)
    private userTagRepository: Repository<UserTag>,
  ) {}

  // ==================== 系統廣播相關 ====================
  
  /**
   * 檢查用戶是否為新會員（最近7天內註冊）
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
      // 如果沒有找到註冊記錄，表示這個用戶不存在或資料異常
      return false;
    }

    // 計算註冊時間距離現在的天數
    const now = new Date();
    const registrationDate = registrationLog.created_at;
    const daysDiff = Math.floor((now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));

    // 新會員定義：最近7天內註冊
    return daysDiff <= 7;
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
          sendToNewMembers = true; // 修改：讓一般廣播也能被新會員接收
          break;
      }
    }

    const broadcast = this.broadcastRepository.create({
      senderId,
      companyId,
      ...createBroadcastDto,
      sendToNewMembers,
    });

    const savedBroadcast = await this.broadcastRepository.save(broadcast);
    
    return savedBroadcast;
  }

  /**
   * 創建標籤群組廣播
   */
  async createTagGroupBroadcast(
    senderId: number,
    companyId: number,
    createBroadcastDto: {
      title: string;
      content: string;
      broadcastType: 'TAG_GROUP';
      targetAudience: 'TAG_USERS';
      targetTagIds: number[];
      targetTagNames: string;
    }
  ): Promise<SystemBroadcast> {
    
    // 驗證標籤ID是否有效
    if (!createBroadcastDto.targetTagIds || createBroadcastDto.targetTagIds.length === 0) {
      throw new Error('請選擇至少一個標籤');
    }

    // 檢查是否有用戶擁有這些標籤
    const usersWithTags = await this.userTagRepository
      .createQueryBuilder('userTag')
      .innerJoin('userTag.user', 'user')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('user.role = :role', { role: UserRole.USER })
      .andWhere('userTag.tag_id IN (:...tagIds)', { tagIds: createBroadcastDto.targetTagIds })
      .getCount();


    if (usersWithTags === 0) {
      throw new Error('找不到具有指定標籤的用戶');
    }

    // 創建廣播記錄
    const broadcast = this.broadcastRepository.create({
      senderId,
      companyId,
      title: createBroadcastDto.title,
      content: createBroadcastDto.content,
      broadcastType: 'TAG_GROUP',
      targetAudience: 'TAG_USERS',
      targetTagIds: JSON.stringify(createBroadcastDto.targetTagIds),
      targetTagNames: createBroadcastDto.targetTagNames,
      sendToNewMembers: false, // 標籤群組不補發給新會員
    });

    const savedBroadcast = await this.broadcastRepository.save(broadcast);
    
    return savedBroadcast;
  }

  /**
   * 檢查用戶是否擁有指定標籤
   */
  private async userHasTags(userId: number, companyId: number, tagIds: number[]): Promise<boolean> {
    const userTagCount = await this.userTagRepository
      .createQueryBuilder('userTag')
      .innerJoin('userTag.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('user.company_id = :companyId', { companyId })
      .andWhere('userTag.tag_id IN (:...tagIds)', { tagIds })
      .getCount();
    
    return userTagCount > 0;
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
    
    // 獲取用戶的註冊時間
    let userRegistrationTime = new Date(0); // 預設很早的時間
    if (isNewMemberResult) {
      const registrationLog = await this.auditLogRepository
        .createQueryBuilder('audit')
        .where('audit.user_id = :userId', { userId })
        .andWhere('audit.action LIKE :action', { action: '%註冊後自動登入%' })
        .orderBy('audit.created_at', 'ASC')
        .getOne();
      
      if (registrationLog) {
        userRegistrationTime = registrationLog.created_at;
      }
    }
    
    // 解析已刪除的廣播ID列表
    let deletedBroadcastIds: number[] = [];
    try {
      deletedBroadcastIds = loginLog?.deletedBroadcastIds ? JSON.parse(loginLog.deletedBroadcastIds) : [];
    } catch (error) {
      console.error('解析已刪除廣播ID失敗:', error);
      deletedBroadcastIds = [];
    }
    
    // 解析已讀的廣播ID列表
    let readBroadcastIds: number[] = [];
    try {
      readBroadcastIds = loginLog?.readBroadcastIds ? JSON.parse(loginLog.readBroadcastIds) : [];
    } catch (error) {
      console.error('解析已讀廣播ID失敗:', error);
      readBroadcastIds = [];
    }
    
    let queryBuilder = this.broadcastRepository
      .createQueryBuilder('broadcast')
      .where('broadcast.companyId = :companyId', { companyId })
      .andWhere('broadcast.isActive = true')
      .andWhere('(broadcast.expiresAt IS NULL OR broadcast.expiresAt > NOW())');
    
    if (isNewMemberResult) {
      // 新會員邏輯：接收新會員專屬廣播 + 標記為「補發給新會員」的廣播 + 標籤群組廣播
      queryBuilder = queryBuilder.andWhere(
        '(broadcast.broadcastType = :newMemberType OR broadcast.broadcastType = :tagGroupType OR (broadcast.sendToNewMembers = true AND broadcast.createdAt > :userRegistrationTime))',
        { 
          newMemberType: 'NEW_MEMBER',
          tagGroupType: 'TAG_GROUP',
          userRegistrationTime: userRegistrationTime
        }
      );
      
      // 新會員還需要檢查有效天數限制（PostgreSQL 語法）
      queryBuilder = queryBuilder.andWhere(
        '(broadcast.validDays IS NULL OR EXTRACT(DAY FROM (NOW() - broadcast.createdAt)) <= broadcast.validDays)'
      );
    } else {
      // 舊會員邏輯：顯示所有廣播（除了新會員專屬廣播），包含標籤群組廣播
      queryBuilder = queryBuilder.andWhere('broadcast.broadcastType != :newMemberType', { newMemberType: 'NEW_MEMBER' });
    }
    
    // 排除已刪除的廣播
    if (deletedBroadcastIds.length > 0) {
      queryBuilder = queryBuilder.andWhere('broadcast.id NOT IN (:...deletedIds)', { deletedIds: deletedBroadcastIds });
    }
    
    // 排除已讀的廣播
    if (readBroadcastIds.length > 0) {
      queryBuilder = queryBuilder.andWhere('broadcast.id NOT IN (:...readIds)', { readIds: readBroadcastIds });
    }
    
    const candidateBroadcasts = await queryBuilder
      .orderBy('broadcast.createdAt', 'DESC')
      .getMany();
    
    // 過濾標籤群組廣播 - 只顯示用戶擁有對應標籤的廣播
    const filteredBroadcasts: SystemBroadcast[] = [];
    for (const broadcast of candidateBroadcasts) {
      if (broadcast.broadcastType === 'TAG_GROUP' && broadcast.targetTagIds) {
        try {
          const targetTagIds = JSON.parse(broadcast.targetTagIds);
          const hasTargetTags = await this.userHasTags(userId, companyId, targetTagIds);
          if (hasTargetTags) {
            filteredBroadcasts.push(broadcast);
          }
        } catch (error) {
          console.error('解析標籤群組廣播目標標籤ID失敗:', error);
          // 如果解析失敗，跳過這個廣播
        }
      } else {
        // 非標籤群組廣播，直接添加
        filteredBroadcasts.push(broadcast);
      }
    }
    
    return filteredBroadcasts;
  }

  /**
   * 獲取所有廣播（會員查看，排除已刪除的）
   */
  async getAllBroadcasts(companyId: number, page = 1, limit = 20, userId?: number, options?: {
    createdFrom?: string;
    createdTo?: string;
    search?: string;
  }): Promise<{
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
        // 獲取用戶的註冊時間
        const registrationLog = await this.auditLogRepository
          .createQueryBuilder('audit')
          .where('audit.user_id = :userId', { userId })
          .andWhere('audit.action LIKE :action', { action: '%註冊後自動登入%' })
          .orderBy('audit.created_at', 'ASC')
          .getOne();
        
        const userRegistrationTime = registrationLog ? registrationLog.created_at : new Date(0);
        
        // 新會員：接收新會員專屬廣播 + 標記為「補發給新會員」且在註冊後建立的廣播 + 標籤群組廣播
        queryBuilder = queryBuilder.andWhere(
          '(broadcast.broadcastType = :newMemberType OR broadcast.broadcastType = :tagGroupType OR (broadcast.sendToNewMembers = true AND broadcast.createdAt > :userRegistrationTime))',
          { 
            newMemberType: 'NEW_MEMBER',
            tagGroupType: 'TAG_GROUP',
            userRegistrationTime: userRegistrationTime
          }
        );
        
        // 新會員還需要檢查有效天數限制（PostgreSQL 語法）
        queryBuilder = queryBuilder.andWhere(
          '(broadcast.validDays IS NULL OR EXTRACT(DAY FROM (NOW() - broadcast.createdAt)) <= broadcast.validDays)'
        );
      } else {
        // 舊會員：排除新會員專屬廣播
        queryBuilder = queryBuilder.andWhere('broadcast.broadcastType != :newMemberType', { newMemberType: 'NEW_MEMBER' });
      }
    }

    // 排除已刪除的廣播
    if (deletedBroadcastIds.length > 0) {
      queryBuilder = queryBuilder.andWhere('broadcast.id NOT IN (:...deletedIds)', { deletedIds: deletedBroadcastIds });
    }

    // 時間篩選
    if (options?.createdFrom) {
      queryBuilder = queryBuilder.andWhere('broadcast.createdAt >= :createdFrom', { createdFrom: options.createdFrom });
    }

    if (options?.createdTo) {
      queryBuilder = queryBuilder.andWhere('broadcast.createdAt <= :createdTo', { createdTo: options.createdTo });
    }

    // 搜尋功能
    if (options?.search && options.search.trim()) {
      queryBuilder = queryBuilder.andWhere(
        '(broadcast.title LIKE :search OR broadcast.content LIKE :search OR sender.username LIKE :search)',
        { search: `%${options.search.trim()}%` }
      );
    }

    const [candidateBroadcasts, total] = await queryBuilder
      .orderBy('broadcast.createdAt', 'DESC')
      .getManyAndCount();

    // 如果有userId，需要過濾標籤群組廣播
    let filteredBroadcasts = candidateBroadcasts;
    if (userId) {
      filteredBroadcasts = [] as SystemBroadcast[];
      for (const broadcast of candidateBroadcasts) {
        if (broadcast.broadcastType === 'TAG_GROUP' && broadcast.targetTagIds) {
          try {
            const targetTagIds = JSON.parse(broadcast.targetTagIds);
            const hasTargetTags = await this.userHasTags(userId, companyId, targetTagIds);
            if (hasTargetTags) {
              filteredBroadcasts.push(broadcast);
            }
          } catch (error) {
            console.error('解析標籤群組廣播目標標籤ID失敗:', error);
          }
        } else {
          // 非標籤群組廣播，直接添加
          filteredBroadcasts.push(broadcast);
        }
      }
    }

    // 應用分頁
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBroadcasts = filteredBroadcasts.slice(startIndex, endIndex);

    return { 
      broadcasts: paginatedBroadcasts, 
      total: filteredBroadcasts.length, 
      page, 
      limit 
    };
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
      // 更新現有記錄，但不更新 lastBroadcastCheckAt，讓會員能持續看到廣播
      await this.userLoginLogRepository.update(
        { userId, companyId },
        { 
          lastLoginAt: new Date()
        }
      );
    } else {
      // 創建新記錄
      const newLog = this.userLoginLogRepository.create({
        userId,
        companyId,
        lastBroadcastCheckAt: new Date(0), // 設為很早的時間
        lastLoginAt: new Date(),
        deletedBroadcastIds: '[]'
      });
      await this.userLoginLogRepository.save(newLog);
    }
  }

  /**
   * 標記單個廣播為已讀（新增方法）
   */
  async markSingleBroadcastAsRead(userId: number, companyId: number, broadcastId: number): Promise<void> {
    // 檢查是否已存在記錄
    let existingLog = await this.userLoginLogRepository.findOne({
      where: { userId, companyId }
    });

    // 解析已讀廣播ID列表
    let readBroadcastIds: number[] = [];
    
    if (existingLog) {
      // 解析現有的已讀廣播ID列表
      try {
        // 使用一個新的欄位來追蹤已讀廣播ID，而不是依賴時間
        // 首先檢查是否有 readBroadcastIds 欄位，如果沒有就創建
        let readBroadcastIdsStr = existingLog.readBroadcastIds || '[]';
        readBroadcastIds = JSON.parse(readBroadcastIdsStr);
        
        // 如果該廣播ID還沒有在已讀列表中，則添加
        if (!readBroadcastIds.includes(broadcastId)) {
          readBroadcastIds.push(broadcastId);
          
          await this.userLoginLogRepository.update(
            { userId, companyId },
            { 
              readBroadcastIds: JSON.stringify(readBroadcastIds),
              lastLoginAt: new Date()
            }
          );
        }
      } catch (error) {
        console.error('標記單個廣播已讀失敗:', error);
        // 如果解析失敗，創建新的已讀列表
        readBroadcastIds = [broadcastId];
        await this.userLoginLogRepository.update(
          { userId, companyId },
          { 
            readBroadcastIds: JSON.stringify(readBroadcastIds),
            lastLoginAt: new Date()
          }
        );
      }
    } else {
      // 創建新記錄
      readBroadcastIds = [broadcastId];
      const newLog = this.userLoginLogRepository.create({
        userId,
        companyId,
        lastBroadcastCheckAt: new Date(0), // 設定為很早的時間
        lastLoginAt: new Date(),
        deletedBroadcastIds: '[]',
        readBroadcastIds: JSON.stringify(readBroadcastIds)
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
      
      // 更新記錄，但不更新 lastBroadcastCheckAt
      await this.userLoginLogRepository.update(
        { userId, companyId },
        { 
          deletedBroadcastIds: JSON.stringify(deletedBroadcastIds),
          lastLoginAt: new Date()
        }
      );
    } else {
      // 創建新記錄
      deletedBroadcastIds = [broadcastId];
      const newLog = this.userLoginLogRepository.create({
        userId,
        companyId,
        lastBroadcastCheckAt: new Date(0), // 設為很早的時間
        lastLoginAt: new Date(),
        deletedBroadcastIds: JSON.stringify(deletedBroadcastIds)
      });
      await this.userLoginLogRepository.save(newLog);
    }
    
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
  async markPersonalMessageAsRead(messageId: number, userId: number, companyId?: number): Promise<{ success: boolean }> {
    const updateConditions: any = { id: messageId, receiverId: userId };
    if (companyId) {
      updateConditions.companyId = companyId;
    }
    
    const result = await this.personalMessageRepository.update(
      updateConditions,
      { isRead: true, readAt: new Date() }
    );
    
    if (result.affected === 0) {
      throw new Error(`個人消息 ${messageId} 不存在或無權限標記為已讀`);
    }
    
    return { success: true };
  }

  /**
   * 刪除個人訊息（軟刪除）
   */
  async deletePersonalMessage(messageId: number, userId: number, companyId?: number): Promise<{ success: boolean }> {
    const updateConditions: any = { id: messageId, receiverId: userId };
    if (companyId) {
      updateConditions.companyId = companyId;
    }
    
    const result = await this.personalMessageRepository.update(
      updateConditions,
      { isDeletedByReceiver: true }
    );
    
    if (result.affected === 0) {
      throw new Error(`個人消息 ${messageId} 不存在或無權限刪除`);
    }
    
    return { success: true };
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