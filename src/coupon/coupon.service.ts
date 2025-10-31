import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, Not } from 'typeorm';
import { CouponTemplate } from './coupon-template.entity';
import { Coupon } from './coupon.entity';
import { CouponUsageLog } from './coupon-usage-log.entity';
import { User } from '../user/user.entity';
import { CreateCouponTemplateDto } from './dto/create-coupon-template.dto';
import { PublicCouponDto } from './dto/public-coupon.dto';
import { BatchCouponDto } from './dto/batch-coupon.dto';
import { ValidateCouponDto, UseCouponDto } from './dto/validate-coupon.dto';
import { WalletTransactionService } from '../wallet-transaction/wallet-transaction.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(CouponTemplate)
    private couponTemplateRepository: Repository<CouponTemplate>,
    
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    
    @InjectRepository(CouponUsageLog)
    private couponUsageLogRepository: Repository<CouponUsageLog>,
    
    @InjectRepository(User)
    private userRepository: Repository<User>,
    
    private dataSource: DataSource,
    private walletTransactionService: WalletTransactionService,
    private auditLogService: AuditLogService,
  ) {}

  // 統一 IP 格式的輔助函數
  private normalizeIP(ip: string): string {
    if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
      return '127.0.0.1';
    }
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    return ip;
  }

  // 記錄優惠券操作到 audit log
  async recordCouponOperation(payload: {
    operatorUser: any;
    operationType: 'CREATE_TEMPLATE' | 'DELETE_TEMPLATE' | 'DISTRIBUTE_COUPON' | 'DELETE_COUPON' | 'USE_COUPON';
    templateId?: number;
    templateName?: string;
    couponId?: number;
    couponCode?: string;
    targetUser?: string;
    beforeStatus?: string;
    afterStatus?: string;
    ip: string;
    platform: string;
  }) {
    const {
      operatorUser,
      operationType,
      templateId,
      templateName,
      couponId,
      couponCode,
      targetUser,
      beforeStatus,
      afterStatus,
      ip,
      platform,
    } = payload;

    const actionMap = {
      CREATE_TEMPLATE: '新增優惠券模板',
      DELETE_TEMPLATE: '刪除優惠券模板',
      DISTRIBUTE_COUPON: '發放優惠券',
      DELETE_COUPON: '刪除優惠券',
      USE_COUPON: '兌換優惠券',
    };

    let actionDescription = actionMap[operationType];
    let target = '';

    if (templateName || templateId) {
      actionDescription += ` - ${templateName || `模板ID: ${templateId}`}`;
      target = `CouponTemplate:${templateId}`;
    }
    
    if (couponCode || couponId) {
      actionDescription += ` - ${couponCode || `優惠券ID: ${couponId}`}`;
      target = `Coupon:${couponId}`;
    }

    if (targetUser) {
      actionDescription += ` (目標用戶: ${targetUser})`;
    }

    return this.auditLogService.record({
      user: operatorUser,
      action: actionDescription,
      ip: this.normalizeIP(ip),
      platform,
      target,
      before: {
        templateId,
        templateName,
        couponId,
        couponCode,
        targetUser,
        status: beforeStatus,
      },
      after: {
        templateId,
        templateName,
        couponId,
        couponCode,
        targetUser,
        status: afterStatus,
      },
    });
  }


  // 確保優惠碼唯一性
  async generateUniqueCouponCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = this.generateCouponCode();
      const existing = await this.couponRepository.findOne({ where: { code } });
      if (!existing) {
        return code;
      }
      attempts++;
    } while (attempts < maxAttempts);

    throw new Error('無法生成唯一優惠碼，請稍後再試');
  }

  // 創建優惠碼模板
  async createTemplate(companyId: number, createDto: CreateCouponTemplateDto): Promise<CouponTemplate> {
    // 驗證日期
    if (createDto.validFrom >= createDto.validTo) {
      throw new BadRequestException('有效期開始時間必須早於結束時間');
    }

    // 驗證折扣值
    if (createDto.discountType === 'PERCENTAGE') {
      if (createDto.discountValue < 1 || createDto.discountValue > 99) {
        throw new BadRequestException('百分比折扣必須在1-99之間');
      }
    }

    const template = this.couponTemplateRepository.create({
      ...createDto,
      companyId,
    });

    return await this.couponTemplateRepository.save(template);
  }

  // 獲取模板列表
  async getTemplates(companyId: number): Promise<CouponTemplate[]> {
    return await this.couponTemplateRepository.find({
      where: { companyId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  // 獲取模板詳情
  async getTemplate(id: number, companyId: number): Promise<CouponTemplate> {
    const template = await this.couponTemplateRepository.findOne({
      where: { id, companyId },
      relations: ['coupons'],
    });

    if (!template) {
      throw new NotFoundException('優惠碼模板不存在');
    }

    return template;
  }

  // 刪除模板
  async deleteTemplate(id: number, companyId: number): Promise<{ message: string }> {
    const template = await this.couponTemplateRepository.findOne({
      where: { id, companyId },
      relations: ['coupons'],
    });

    if (!template) {
      throw new NotFoundException('優惠碼模板不存在');
    }

    // 檢查是否有已發放的優惠碼
    const couponCount = await this.couponRepository.count({
      where: { templateId: id }
    });

    if (couponCount > 0) {
      // 檢查是否有已使用的優惠碼
      const usedCoupons = await this.couponRepository.find({
        where: { templateId: id, isUsed: true }
      });
      
      // 檢查是否有使用記錄（適用於公共優惠碼）
      const usageLogCount = await this.couponUsageLogRepository
        .createQueryBuilder('log')
        .innerJoin('log.coupon', 'coupon')
        .where('coupon.templateId = :templateId', { templateId: id })
        .getCount();
      
      if (usedCoupons.length > 0 || usageLogCount > 0) {
        throw new BadRequestException(`此優惠碼已被使用過，無法刪除！`);
      }
      
      // 如果只有未使用的優惠碼，先刪除這些優惠碼
      await this.couponRepository.delete({ templateId: id });
    }

    // 刪除模板
    await this.couponTemplateRepository.remove(template);

    return { message: '優惠碼模板刪除成功' };
  }

  // 優惠碼生成函數
  private generateCouponCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 發放批量優惠碼（輕量化批次處理版本）
  async distributeBatchCoupons(companyId: number, adminUserId: number, dto: any): Promise<{ distributedCount: number, message: string }> {
    
    const { templateId, targetType, tagIds, userIds } = dto;

    // 檢查模板是否存在
    const template = await this.couponTemplateRepository.findOne({
      where: { id: templateId, companyId }
    });

    if (!template) {
      console.error('❌ 優惠碼模板不存在:', { templateId, companyId });
      throw new NotFoundException('優惠碼模板不存在');
    }

    if (!template.isActive) {
      console.error('❌ 模板未啟用:', template);
      throw new BadRequestException('模板未啟用，無法發放');
    }


    // 獲取目標用戶數量（不載入全部用戶到記憶體）
    let totalUserCount = 0;

    if (targetType === 'ALL_USERS') {
      totalUserCount = await this.userRepository.count({
        where: { 
          company_id: companyId, 
          role: Not(In(['SUPER_ADMIN', 'GLOBAL_ADMIN'])) 
        }
      });
    } else if (targetType === 'TAG_GROUP' && tagIds?.length > 0) {
      totalUserCount = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user_tag', 'ut', 'ut.user_id = user.id')
        .where('user.company_id = :companyId', { companyId })
        .andWhere('ut.tag_id IN (:...tagIds)', { tagIds })
        .andWhere('user.role NOT IN (:...excludeRoles)', { 
          excludeRoles: ['SUPER_ADMIN', 'GLOBAL_ADMIN'] 
        })
        .getCount();
    } else if (targetType === 'SPECIFIC_USERS' && userIds?.length > 0) {
      totalUserCount = await this.userRepository.count({
        where: { id: In(userIds), company_id: companyId }
      });
    }


    if (totalUserCount === 0) {
      throw new BadRequestException('沒有找到符合條件的用戶');
    }

    // 批次處理配置（針對大量用戶優化）
    let actualBatchSize: number;
    
    if (totalUserCount > 20000) {
      // 超大量用戶（2萬+）：更保守的批次大小
      actualBatchSize = 200;
    } else if (totalUserCount > 5000) {
      // 大量用戶（5千-2萬）：標準批次大小
      actualBatchSize = 300;
    } else {
      // 中小量用戶（5千以下）：較大批次提高效率
      actualBatchSize = 500;
    }
    
    const totalBatches = Math.ceil(totalUserCount / actualBatchSize);
    let totalDistributed = 0;


    // 分批處理用戶
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const offset = batchIndex * actualBatchSize;

      // 分批獲取用戶
      let batchUsers: any[] = [];
      
      if (targetType === 'ALL_USERS') {
        batchUsers = await this.userRepository.find({
          where: { 
            company_id: companyId, 
            role: Not(In(['SUPER_ADMIN', 'GLOBAL_ADMIN'])) 
          },
          skip: offset,
          take: actualBatchSize
        });
      } else if (targetType === 'TAG_GROUP' && tagIds?.length > 0) {
        batchUsers = await this.userRepository
          .createQueryBuilder('user')
          .innerJoin('user_tag', 'ut', 'ut.user_id = user.id')
          .where('user.company_id = :companyId', { companyId })
          .andWhere('ut.tag_id IN (:...tagIds)', { tagIds })
          .andWhere('user.role NOT IN (:...excludeRoles)', { 
            excludeRoles: ['SUPER_ADMIN', 'GLOBAL_ADMIN'] 
          })
          .skip(offset)
          .take(actualBatchSize)
          .getMany();
      } else if (targetType === 'SPECIFIC_USERS' && userIds?.length > 0) {
        const batchUserIds = userIds.slice(offset, offset + actualBatchSize);
        batchUsers = await this.userRepository.find({
          where: { id: In(batchUserIds), company_id: companyId }
        });
      }

      if (batchUsers.length === 0) {
        continue;
      }

      // 過濾已有優惠券的用戶
      const existingCoupons = await this.couponRepository.find({
        where: { templateId, assignedUserId: In(batchUsers.map(u => u.id)) },
        select: ['assignedUserId']
      });
      
      const usersWithCoupons = new Set(existingCoupons.map(c => c.assignedUserId));
      const usersToDistribute = batchUsers.filter(user => !usersWithCoupons.has(user.id));

      if (usersToDistribute.length === 0) {
        continue;
      }

      // 批次生成優惠碼（輕量化版本）
      const batchResult = await this.generateAndSaveCouponBatch(templateId, usersToDistribute);
      totalDistributed += batchResult.count;

      // 動態休息時間，根據批次大小調整
      if (batchIndex < totalBatches - 1) {
        const restTime = Math.min(200, Math.max(50, actualBatchSize / 2)); // 50-200ms 動態休息
        await new Promise(resolve => setTimeout(resolve, restTime));
      }
    }

    // 發送通知 (異步處理)
    if (targetType === 'TAG_GROUP' && tagIds?.length > 0) {
      setImmediate(() => {
        this.sendCouponNotification(companyId, adminUserId, template, tagIds);
      });
    } else if (targetType === 'ALL_USERS' || targetType === 'SPECIFIC_USERS') {
      // 為所有用戶或指定用戶發送通知
      setImmediate(() => {
        this.sendAllUsersNotification(companyId, adminUserId, template);
      });
    }


    return {
      distributedCount: totalDistributed,
      message: `成功批次發放 ${totalDistributed} 張優惠券`
    };
  }

  // 輕量化批次生成和保存優惠券
  private async generateAndSaveCouponBatch(templateId: number, users: any[]): Promise<{ count: number }> {
    // 預生成一批唯一代碼（避免在循環中查詢資料庫）
    const codes = await this.generateUniqueCoupons(users.length);
    
    // 直接使用 SQL 批量插入（最高效能）
    const values = users.map((user, index) => 
      `(${templateId}, '${codes[index]}', ${user.id}, false, NOW())`
    ).join(', ');

    const sql = `
      INSERT INTO coupons (template_id, code, assigned_user_id, is_used, created_at) 
      VALUES ${values}
    `;

    await this.dataSource.query(sql);
    
    return { count: users.length };
  }

  // 高效生成唯一優惠碼
  private async generateUniqueCoupons(count: number): Promise<string[]> {
    const codes: string[] = [];
    const maxAttempts = count * 2; // 最多嘗試次數
    let attempts = 0;

    // 一次查詢所有現有代碼（快取在記憶體中）
    const existingCodes = new Set<string>();
    const recentCoupons = await this.couponRepository.find({
      select: ['code'],
      order: { id: 'DESC' },
      take: 50000 // 只檢查最近的 5 萬筆
    });
    
    recentCoupons.forEach(c => existingCodes.add(c.code));

    while (codes.length < count && attempts < maxAttempts) {
      const code = this.generateCouponCode();
      
      if (!existingCodes.has(code) && !codes.includes(code)) {
        codes.push(code);
        existingCodes.add(code); // 避免重複
      }
      
      attempts++;
    }

    if (codes.length < count) {
      throw new BadRequestException(`只能生成 ${codes.length}/${count} 個唯一優惠碼，請稍後再試`);
    }

    return codes;
  }

  // 發送優惠券通知
  private async sendCouponNotification(companyId: number, adminUserId: number, template: any, tagIds: number[]) {
    try {
      
      // 創建系統廣播訊息（使用正確的字段）
      const broadcastData = {
        companyId,
        senderId: adminUserId,  // ✅ 使用正確的字段名
        title: `${template.name} 優惠券已發放`,
        content: `恭喜您獲得專屬優惠券！請至「我的優惠券」頁面查看詳情。`,
        broadcastType: 'TAG_GROUP',  // ✅ 使用 Entity 支援的值
        targetAudience: 'TAG_USERS', // ✅ 發送給標籤用戶
        targetTagIds: JSON.stringify(tagIds),
        targetTagNames: null,
        isActive: true,
        expiresAt: null,
        sendToNewMembers: false
      };

      await this.dataSource.getRepository('SystemBroadcast').save(broadcastData);
    } catch (error) {
      console.error('❌ 發送優惠券通知失敗:', error);
      console.error('❌ 錯誤詳情:', error.message);
      // 不要讓通知失敗影響優惠券發放
    }
  }

  // 發送公共優惠碼通知
  private async sendPublicCouponNotification(companyId: number, adminUserId: number, template: any, couponCode: string) {
    try {
      // 創建系統廣播訊息給所有用戶（使用正確的字段）
      const broadcastData = {
        companyId,
        senderId: adminUserId,  // ✅ 使用正確的字段名
        title: `🎫 新的公共優惠碼：${couponCode}`,
        content: `🎉 ${template.name} 已發放！優惠碼：${couponCode}，請至「我的優惠券」或結帳時使用。`,
        broadcastType: 'GENERAL',  // ✅ 使用 Entity 支援的值
        targetAudience: 'ALL',     // ✅ 發送給所有用戶
        targetTagIds: null,
        targetTagNames: null,
        isActive: true,
        expiresAt: null,
        sendToNewMembers: true   // ✅ 修復：讓新會員也能收到公共優惠碼通知
      };

      const result = await this.dataSource.getRepository('SystemBroadcast').save(broadcastData);
    } catch (error) {
      console.error('❌ 發送公共優惠碼通知失敗:', error);
      // 不要讓通知失敗影響優惠券發放
    }
  }

  // 發送批量優惠券通知給所有用戶
  private async sendAllUsersNotification(companyId: number, adminUserId: number, template: any) {
    try {
      
      // 創建系統廣播訊息給所有用戶
      const broadcastData = {
        companyId,
        senderId: adminUserId,
        title: `${template.name} 優惠券已發放`,
        content: `恭喜您獲得專屬優惠券！請至「我的優惠券」頁面查看詳情。`,
        broadcastType: 'GENERAL',  // 發送給所有用戶
        targetAudience: 'ALL',     // 所有用戶
        targetTagIds: null,
        targetTagNames: null,
        isActive: true,
        expiresAt: null,
        sendToNewMembers: true
      };

      await this.dataSource.getRepository('SystemBroadcast').save(broadcastData);
    } catch (error) {
      console.error('❌ 發送批量優惠券通知失敗:', error);
      console.error('❌ 錯誤詳情:', error.message);
      // 不要讓通知失敗影響優惠券發放
    }
  }

  // 發送現金優惠券通知給所有用戶
  private async sendCashCouponNotification(companyId: number, template: any, couponCode: string) {
    try {
      
      // 創建系統廣播訊息給所有用戶
      const broadcastData = {
        companyId,
        senderId: 1, // 系統發送
        title: `💰 新的現金優惠券：${couponCode}`,
        content: `🎉 ${template.name} 已發放！優惠碼：${couponCode}，立即兌換可獲得現金！`,
        broadcastType: 'GENERAL',  // 發送給所有用戶
        targetAudience: 'ALL',     // 所有用戶
        targetTagIds: null,
        targetTagNames: null,
        isActive: true,
        expiresAt: null,
        sendToNewMembers: true
      };

      await this.dataSource.getRepository('SystemBroadcast').save(broadcastData);
    } catch (error) {
      console.error('❌ 發送現金優惠券通知失敗:', error);
      console.error('❌ 錯誤詳情:', error.message);
      // 不要讓通知失敗影響優惠券發放
    }
  }


  // 發放公共優惠碼
  async distributePublicCoupon(companyId: number, adminUserId: number, dto: PublicCouponDto): Promise<Coupon> {
    const template = await this.getTemplate(dto.templateId, companyId);
    
    if (template.type !== 'PUBLIC') {
      throw new BadRequestException('此模板不支援公共優惠碼');
    }

    // 檢查代碼是否已存在
    const existing = await this.couponRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException('優惠碼已存在');
    }

    // 更新模板的使用限制
    await this.couponTemplateRepository.update(dto.templateId, {
      usageLimit: dto.usageLimit,
    });

    const coupon = this.couponRepository.create({
      templateId: dto.templateId,
      code: dto.code,
      assignedUserId: null, // 公共優惠碼不指定用戶
    });

    const savedCoupon = await this.couponRepository.save(coupon);

    // 發送公共優惠碼通知給所有用戶
    await this.sendPublicCouponNotification(companyId, adminUserId, template, dto.code);

    return savedCoupon;
  }



  // 獲取用戶的優惠碼
  async getUserCoupons(userId: number, companyId: number): Promise<any[]> {
    
    // 查詢用戶專屬的優惠碼 + 公共優惠碼
    const userCoupons = await this.couponRepository
      .createQueryBuilder('coupon')
      .leftJoinAndSelect('coupon.template', 'template')
      .where('template.companyId = :companyId', { companyId })
      .andWhere('(coupon.assignedUserId = :userId OR (coupon.assignedUserId IS NULL AND template.type = :publicType))', { 
        userId, 
        publicType: 'PUBLIC' 
      })
      .orderBy('coupon.createdAt', 'DESC')
      .getMany();

    // 為每張優惠券檢查用戶的使用狀態
    const couponsWithUserStatus = await Promise.all(
      userCoupons.map(async (coupon) => {
        let userHasUsed = false;
        
        if (coupon.assignedUserId === null) {
          // 公共優惠券：檢查用戶是否在 usage log 中有記錄
          userHasUsed = await this.hasUserUsedCoupon(userId, coupon.id);
        } else {
          // 個人優惠券：直接使用 isUsed 字段
          userHasUsed = coupon.isUsed;
        }
        
        return {
          ...coupon,
          isUsed: userHasUsed, // 對於前端來說，這表示"用戶是否已使用"
          userHasUsed, // 明確的用戶使用狀態
        };
      })
    );

    
    return couponsWithUserStatus;
  }

  // 驗證優惠碼
  async validateCoupon(userId: number, companyId: number, dto: ValidateCouponDto): Promise<{
    valid: boolean;
    message?: string;
    discountAmount?: number;
    finalAmount?: number;
  }> {
    // 1. 檢查優惠碼是否存在
    const coupon = await this.couponRepository.findOne({
      where: { code: dto.code },
      relations: ['template'],
    });


    if (!coupon) {
      return { valid: false, message: '優惠碼不存在' };
    }

    // 檢查公司範圍
    if (coupon.template.companyId !== companyId) {
      return { valid: false, message: '優惠碼不存在' };
    }

    // 2. 檢查是否已使用（僅適用於用戶專屬優惠碼）
    if (coupon.isUsed && coupon.assignedUserId !== null) {
      return { valid: false, message: '優惠碼已使用' };
    }

    // 3. 檢查是否有使用權限 (BATCH類型)
    if (coupon.assignedUserId && coupon.assignedUserId !== userId) {
      return { valid: false, message: '此優惠碼不屬於您' };
    }

    // 4. 檢查模板有效期
    const template = coupon.template;
    const now = new Date();
    if (now < template.validFrom || now > template.validTo) {
      return { valid: false, message: '優惠碼已過期' };
    }

    // 5. 檢查最低消費金額
    if (dto.amount < template.minAmount) {
      return { valid: false, message: `最低消費金額 ${template.minAmount} 元` };
    }

    // 6. 檢查 PUBLIC 類型的使用次數限制
    if (coupon.assignedUserId === null) {
      // 這是公共優惠碼，需要檢查使用次數限制
      const usageCount = await this.getCouponUsageCount(coupon.id);
      if (template.usageLimit && usageCount >= template.usageLimit) {
        return { valid: false, message: '優惠碼使用次數已達上限' };
      }

      // 檢查該用戶是否已使用過此公共優惠碼
      const userUsed = await this.hasUserUsedCoupon(userId, coupon.id);
      if (userUsed) {
        return { valid: false, message: '您已使用過此優惠碼' };
      }
    }

    // 7. 計算折扣金額
    const discountAmount = this.calculateDiscount(template, dto.amount);
    

    return {
      valid: true,
      discountAmount,
      finalAmount: dto.amount - discountAmount,
    };
  }

  // 使用優惠碼
  async useCoupon(userId: number, companyId: number, dto: UseCouponDto): Promise<{
    success: boolean;
    message?: string;
    discountAmount?: number;
    finalAmount?: number;
  }> {
    // 先驗證優惠碼
    const validation = await this.validateCoupon(userId, companyId, {
      code: dto.code,
      amount: dto.amount,
    });

    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    // 獲取優惠碼
    const coupon = await this.couponRepository.findOne({
      where: { code: dto.code },
      relations: ['template'],
    });

    if (!coupon) {
      return { success: false, message: '優惠碼不存在' };
    }

    // 記錄使用日誌
    const usageLog = this.couponUsageLogRepository.create({
      couponId: coupon.id,
      userId,
      orderId: dto.orderId || null,
      discountAmount: validation.discountAmount!,
      originalAmount: dto.amount,
      finalAmount: validation.finalAmount!,
    });

    await this.couponUsageLogRepository.save(usageLog);

    // 只有非公共優惠碼才標記為已使用
    if (coupon.assignedUserId !== null) {
      // 這是用戶專屬優惠碼，標記為已使用
      await this.couponRepository.update(coupon.id, {
        isUsed: true,
        usedBy: userId,
        usedAt: new Date(),
      });
    }
    // 公共優惠碼不標記為已使用，允許其他用戶繼續使用

    return {
      success: true,
      discountAmount: validation.discountAmount,
      finalAmount: validation.finalAmount,
    };
  }

  // 計算折扣金額
  private calculateDiscount(template: CouponTemplate, amount: number): number {
    let discount = 0;

    if (template.discountType === 'PERCENTAGE') {
      discount = Math.floor(amount * (template.discountValue / 100));
      
      // 檢查最大折扣限制
      if (template.maxDiscount && discount > template.maxDiscount) {
        discount = template.maxDiscount;
      }
    } else {
      discount = template.discountValue;
      
      // 折扣不能超過原始金額
      if (discount > amount) {
        discount = amount;
      }
    }

    return discount;
  }

  // 檢查用戶是否已使用過優惠碼
  private async hasUserUsedCoupon(userId: number, couponId: number): Promise<boolean> {
    const usageLog = await this.couponUsageLogRepository.findOne({
      where: { userId, couponId },
    });
    return !!usageLog;
  }

  // 獲取優惠碼使用次數
  private async getCouponUsageCount(couponId: number): Promise<number> {
    return await this.couponUsageLogRepository.count({
      where: { couponId },
    });
  }

  // 獲取優惠碼統計
  async getCouponStats(templateId: number, companyId: number): Promise<{
    template: CouponTemplate;
    totalCoupons: number;
    usedCoupons: number;
    totalDiscount: number;
    usageRate: number;
  }> {
    const template = await this.getTemplate(templateId, companyId);
    
    const totalCoupons = await this.couponRepository.count({
      where: { templateId },
    });

    const usedCoupons = await this.couponRepository.count({
      where: { templateId, isUsed: true },
    });

    const usageLogs = await this.couponUsageLogRepository.find({
      where: { coupon: { templateId } },
      relations: ['coupon'],
    });

    const totalDiscount = usageLogs.reduce((sum, log) => sum + Number(log.discountAmount), 0);
    const usageRate = totalCoupons > 0 ? (usedCoupons / totalCoupons) * 100 : 0;

    return {
      template,
      totalCoupons,
      usedCoupons,
      totalDiscount,
      usageRate: Math.round(usageRate * 100) / 100,
    };
  }

  // 兌換現金優惠券（直接加到錢包）
  async redeemCashCoupon(userId: number, companyId: number, code: string) {
    try {
      // 1. 查找現金優惠券
      const coupon = await this.couponRepository
        .createQueryBuilder('coupon')
        .leftJoinAndSelect('coupon.template', 'template')
        .where('coupon.code = :code', { code })
        .andWhere('template.companyId = :companyId', { companyId })
        .getOne();

      if (!coupon) {
        return { success: false, message: '優惠碼不存在或無效' };
      }

      if (!coupon.template || coupon.template.type !== 'CASH') {
        return { success: false, message: '此優惠碼不是現金優惠券' };
      }

      // 2. 檢查優惠券狀態
      if (coupon.isUsed) {
        return { success: false, message: '此優惠碼已被使用' };
      }

      // 3. 檢查有效期
      const now = new Date();
      if (now < new Date(coupon.template.validFrom) || now > new Date(coupon.template.validTo)) {
        return { success: false, message: '優惠碼已過期或尚未生效' };
      }

      // 4. 檢查使用次數限制（對於公共現金優惠券）
      if (!coupon.assignedUserId) {
        // 公共現金優惠券：檢查用戶是否已經使用過
        const existingUsage = await this.couponUsageLogRepository.findOne({
          where: { 
            couponId: coupon.id, 
            userId
          }
        });

        if (existingUsage) {
          return { success: false, message: '您已使用過此優惠碼' };
        }

        // 檢查使用次數限制
        if (coupon.template.usageLimit) {
          const usageCount = await this.couponUsageLogRepository.count({
            where: { couponId: coupon.id }
          });

          if (usageCount >= coupon.template.usageLimit) {
            return { success: false, message: '此優惠碼使用次數已達上限' };
          }
        }
      } else if (coupon.assignedUserId !== userId) {
        return { success: false, message: '此優惠碼不屬於您' };
      }

      // 5. 開始事務處理
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // 6. 創建錢包交易記錄（在更新餘額前記錄）
        const cashAmount = Number(coupon.template.discountValue);
        await this.walletTransactionService.createTransaction(
          userId,
          companyId,
          'coupon_redeem',
          cashAmount,
          `現金優惠券兌換：${coupon.template.name} (${code})`,
          coupon.id.toString(),
          'coupon',
          '127.0.0.1',
          undefined,
          queryRunner
        );

        // 7. 更新用戶錢包餘額
        await queryRunner.manager.query(
          'UPDATE "user" SET balance = COALESCE(balance, 0) + $1 WHERE id = $2 AND company_id = $3',
          [cashAmount, userId, companyId]
        );

        // 8. 創建使用記錄
        const usageLog = queryRunner.manager.create(CouponUsageLog, {
          couponId: coupon.id,
          userId,
          discountAmount: cashAmount,
          originalAmount: 0, // 現金優惠券不需要原始金額
          finalAmount: 0,    // 現金優惠券不需要最終金額
          usedAt: new Date()
        });
        await queryRunner.manager.save(CouponUsageLog, usageLog);

        // 9. 如果是個人專屬優惠券，標記為已使用
        if (coupon.assignedUserId) {
          coupon.isUsed = true;
          await queryRunner.manager.save(Coupon, coupon);
        }

        // 10. 記錄餘額變動日誌
        await queryRunner.manager.query(`
          INSERT INTO audit_log (user_id, action, target, before, after, ip, platform, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          userId, 
          '現金優惠券兌換',
          `cash_coupon:${coupon.id}`,
          null,
          JSON.stringify({
            couponCode: code,
            cashAmount,
            templateName: coupon.template.name,
            balanceChange: `+${cashAmount}`
          }),
          '127.0.0.1',
          'web'
        ]);

        await queryRunner.commitTransaction();

        return { 
          success: true, 
          message: `成功兌換現金優惠券！獲得 ${cashAmount} 元現金`,
          cashAmount,
          couponName: coupon.template.name
        };

      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

    } catch (error) {
      console.error('兌換現金優惠券失敗:', error);
      return { success: false, message: '兌換失敗，請稍後再試' };
    }
  }

  // 創建現金優惠券
  async createCashCoupon(templateId: number, code: string, companyId: number) {
    try {
      // 1. 驗證模板
      const template = await this.couponTemplateRepository.findOne({
        where: { id: templateId, companyId, type: 'CASH' }
      });

      if (!template) {
        throw new NotFoundException('現金優惠券模板不存在');
      }

      // 2. 檢查優惠碼是否已存在
      const existingCoupon = await this.couponRepository.findOne({
        where: { code: code.toUpperCase() }
      });

      if (existingCoupon) {
        throw new BadRequestException('此優惠碼已存在');
      }

      // 3. 創建現金優惠券
      const coupon = this.couponRepository.create({
        templateId,
        code: code.toUpperCase(),
        isUsed: false,
        assignedUserId: null, // 現金優惠券為公共型
        createdAt: new Date()
      });

      const savedCoupon = await this.couponRepository.save(coupon);

      // 發送現金優惠券通知給所有用戶
      setImmediate(() => {
        this.sendCashCouponNotification(companyId, template, code);
      });

      return { success: true, message: '現金優惠券創建成功', coupon: savedCoupon };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('創建現金優惠券失敗:', error);
      throw new BadRequestException('創建失敗');
    }
  }

  // 獲取現金優惠券列表
  async getCashCoupons(templateId: number, companyId: number) {
    try {
      // 1. 驗證模板
      const template = await this.couponTemplateRepository.findOne({
        where: { id: templateId, companyId, type: 'CASH' }
      });

      if (!template) {
        throw new NotFoundException('現金優惠券模板不存在');
      }

      // 2. 獲取現金優惠券列表
      const coupons = await this.couponRepository.find({
        where: { templateId },
        order: { createdAt: 'DESC' }
      });

      // 3. 統計使用次數
      const result = await Promise.all(
        coupons.map(async (coupon) => {
          const usageCount = await this.couponUsageLogRepository.count({
            where: { couponId: coupon.id }
          });

          return {
            id: coupon.id,
            code: coupon.code,
            isUsed: coupon.isUsed,
            usageCount,
            createdAt: coupon.createdAt
          };
        })
      );

      return result;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('獲取現金優惠券失敗:', error);
      throw new BadRequestException('獲取失敗');
    }
  }

  // 刪除現金優惠券
  async deleteCashCoupon(couponId: number, companyId: number) {
    try {
      // 1. 查找優惠券及其模板
      const coupon = await this.couponRepository
        .createQueryBuilder('coupon')
        .leftJoinAndSelect('coupon.template', 'template')
        .where('coupon.id = :couponId', { couponId })
        .andWhere('template.companyId = :companyId', { companyId })
        .andWhere('template.type = :type', { type: 'CASH' })
        .getOne();

      if (!coupon) {
        throw new NotFoundException('現金優惠券不存在');
      }

      // 2. 檢查是否有使用記錄
      const usageCount = await this.couponUsageLogRepository.count({
        where: { couponId }
      });

      if (usageCount > 0) {
        throw new BadRequestException('此優惠券已有使用記錄，無法刪除');
      }

      // 3. 刪除優惠券
      await this.couponRepository.remove(coupon);

      return { success: true, message: '現金優惠券刪除成功' };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('刪除現金優惠券失敗:', error);
      throw new BadRequestException('刪除失敗');
    }
  }

}