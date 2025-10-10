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
  ) {}


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
      throw new BadRequestException('此模板已有發放的優惠碼，無法刪除');
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
    console.log('🎯 開始批次發放優惠券:', { companyId, adminUserId, dto });
    
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

    console.log('✅ 找到模板:', { id: template.id, name: template.name, type: template.type });

    // 獲取目標用戶數量（不載入全部用戶到記憶體）
    let totalUserCount = 0;
    console.log('🔍 統計目標用戶數量:', { targetType, tagIds, userIds });

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

    console.log('👥 目標用戶總數:', totalUserCount);

    if (totalUserCount === 0) {
      throw new BadRequestException('沒有找到符合條件的用戶');
    }

    // 批次處理配置
    const BATCH_SIZE = 500; // 每批處理 500 個用戶
    const totalBatches = Math.ceil(totalUserCount / BATCH_SIZE);
    let totalDistributed = 0;

    console.log(`📦 開始批次處理: ${totalBatches} 批，每批 ${BATCH_SIZE} 個用戶`);

    // 分批處理用戶
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const offset = batchIndex * BATCH_SIZE;
      console.log(`🔄 處理第 ${batchIndex + 1}/${totalBatches} 批 (偏移: ${offset})`);

      // 分批獲取用戶
      let batchUsers: any[] = [];
      
      if (targetType === 'ALL_USERS') {
        batchUsers = await this.userRepository.find({
          where: { 
            company_id: companyId, 
            role: Not(In(['SUPER_ADMIN', 'GLOBAL_ADMIN'])) 
          },
          skip: offset,
          take: BATCH_SIZE
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
          .take(BATCH_SIZE)
          .getMany();
      } else if (targetType === 'SPECIFIC_USERS' && userIds?.length > 0) {
        const batchUserIds = userIds.slice(offset, offset + BATCH_SIZE);
        batchUsers = await this.userRepository.find({
          where: { id: In(batchUserIds), company_id: companyId }
        });
      }

      if (batchUsers.length === 0) {
        console.log(`⏭️ 第 ${batchIndex + 1} 批沒有用戶，跳過`);
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
        console.log(`⏭️ 第 ${batchIndex + 1} 批用戶都已有優惠券，跳過`);
        continue;
      }

      // 批次生成優惠碼（輕量化版本）
      const batchResult = await this.generateAndSaveCouponBatch(templateId, usersToDistribute);
      totalDistributed += batchResult.count;

      console.log(`✅ 第 ${batchIndex + 1} 批完成: 發放 ${batchResult.count} 張優惠券`);

      // 短暫休息避免資料庫過載
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 發送通知 (異步處理)
    if (targetType === 'TAG_GROUP' && tagIds?.length > 0) {
      setImmediate(() => {
        this.sendCouponNotification(companyId, adminUserId, template, tagIds);
      });
    }

    console.log(`🎉 批次發放完成: 總共發放 ${totalDistributed} 張優惠券`);

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
      console.log('🔔 準備發送優惠券通知:', { companyId, adminUserId, templateName: template.name, tagIds });
      
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
      console.log('✅ 優惠券通知發送成功');
    } catch (error) {
      console.error('❌ 發送優惠券通知失敗:', error);
      console.error('❌ 錯誤詳情:', error.message);
      // 不要讓通知失敗影響優惠券發放
    }
  }

  // 發送公共優惠碼通知
  private async sendPublicCouponNotification(companyId: number, adminUserId: number, template: any, couponCode: string) {
    try {
      console.log('🔔 準備發送公共優惠碼通知:', { companyId, adminUserId, templateName: template.name, couponCode });
      
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
        sendToNewMembers: false
      };

      await this.dataSource.getRepository('SystemBroadcast').save(broadcastData);
      console.log('✅ 公共優惠碼通知發送成功');
    } catch (error) {
      console.error('❌ 發送公共優惠碼通知失敗:', error);
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
    console.log('🔍 查詢用戶優惠券:', { userId, companyId });
    
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

    console.log('📋 找到的優惠券數量:', couponsWithUserStatus.length);
    console.log('📋 優惠券詳情:', couponsWithUserStatus.map(c => ({
      id: c.id,
      code: c.code,
      assignedUserId: c.assignedUserId,
      templateId: c.templateId,
      templateName: c.template?.name,
      templateType: c.template?.type,
      isUsed: c.isUsed,
      userHasUsed: c.userHasUsed,
      createdAt: c.createdAt
    })));
    
    return couponsWithUserStatus;
  }

  // 驗證優惠碼
  async validateCoupon(userId: number, companyId: number, dto: ValidateCouponDto): Promise<{
    valid: boolean;
    message?: string;
    discountAmount?: number;
    finalAmount?: number;
  }> {
    console.log('🎫 前台驗證優惠碼:', { userId, companyId, code: dto.code, amount: dto.amount })
    // 1. 檢查優惠碼是否存在
    const coupon = await this.couponRepository.findOne({
      where: { code: dto.code },
      relations: ['template'],
    });

    console.log('🎫 優惠碼查詢結果:', coupon ? { id: coupon.id, code: coupon.code, templateId: coupon.templateId } : '未找到')

    if (!coupon) {
      console.log('❌ 優惠碼不存在')
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
      console.log('⏰ 檢查用戶是否已使用過公共優惠碼...')
      const userUsed = await this.hasUserUsedCoupon(userId, coupon.id);
      console.log('🔍 公共優惠碼使用檢查結果:', { userId, couponId: coupon.id, userUsed })
      if (userUsed) {
        console.log('❌ 用戶已使用過此公共優惠碼')
        return { valid: false, message: '您已使用過此優惠碼' };
      }
    }

    // 7. 計算折扣金額
    const discountAmount = this.calculateDiscount(template, dto.amount);
    
    console.log('✅ 優惠碼驗證成功:', { 
      code: dto.code, 
      userId, 
      discountAmount, 
      finalAmount: dto.amount - discountAmount 
    })

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
    console.log('🎫 前台使用優惠碼:', { userId, companyId, code: dto.code, amount: dto.amount })
    // 先驗證優惠碼
    const validation = await this.validateCoupon(userId, companyId, {
      code: dto.code,
      amount: dto.amount,
    });

    if (!validation.valid) {
      console.log('❌ 優惠碼驗證失敗:', validation.message)
      return { success: false, message: validation.message };
    }
    
    console.log('✅ 優惠碼驗證通過，開始使用流程...')

    // 獲取優惠碼
    const coupon = await this.couponRepository.findOne({
      where: { code: dto.code },
      relations: ['template'],
    });

    if (!coupon) {
      return { success: false, message: '優惠碼不存在' };
    }

    // 記錄使用日誌
    console.log('📝 創建優惠碼使用記錄...')
    const usageLog = this.couponUsageLogRepository.create({
      couponId: coupon.id,
      userId,
      orderId: dto.orderId || null,
      discountAmount: validation.discountAmount!,
      originalAmount: dto.amount,
      finalAmount: validation.finalAmount!,
    });

    await this.couponUsageLogRepository.save(usageLog);
    console.log('✅ 優惠碼使用記錄已保存:', { couponId: coupon.id, userId, discountAmount: validation.discountAmount })

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
}