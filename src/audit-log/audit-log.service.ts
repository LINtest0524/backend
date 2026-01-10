import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';

interface AuditLogRecordParams {
  user: User | { id: number };
  action: string;
  ip: string;
  platform: string;
  target?: string;
  before?: any;
  after?: any;
}

interface FindFilteredParams {
  currentUser: any;
  from?: string;
  to?: string;
  search?: string;
  user?: string;
  ip?: string;
  target?: string;
  page: number;
  limit: number;
}

interface FindCommissionConditionLogsParams {
  currentUser: any;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  action?: string;
  operator?: string;
  page: number;
  limit: number;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly logRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async record(params: AuditLogRecordParams) {
    const {
      user,
      action,
      ip,
      platform,
      target,
      before,
      after,
    } = params;

    const userId = 'id' in user ? user.id : (user as any).id;

    if (!userId) {
      console.warn('   無法寫入操作紀錄，user id 缺失');
      return;
    }

    const log = this.logRepo.create({
      user: { id: userId },
      action,
      ip,
      platform,
      target,
      before,
      after,
    });

    return this.logRepo.save(log);
  }

  async findAll(): Promise<AuditLog[]> {
    return this.logRepo.find({
      order: { created_at: 'DESC' },
      relations: ['user'],
    });
  }




  async findFiltered(params: FindFilteredParams) {
    const {
      currentUser,
      from,
      to,
      search,
      user,
      ip,
      target,
      page,
      limit,
    } = params;

    const qb = this.logRepo.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.created_at', 'DESC');

    // 🔒 過濾掉前台會員的操作記錄（只顯示後台管理員/代理商的操作）
    qb.andWhere('user.role != :userRole', { userRole: 'USER' });

    // 🔒 只有在「代理商操作紀錄」頁面（沒有指定 target）時才過濾特定操作
    // 其他專屬頁面（黑名單、會員狀態等）不應該被過濾
    if (!target) {
      // 代理商操作紀錄只顯示「代理管理」相關的操作
      // 過濾掉以下操作（這些有專屬的記錄頁面）：
      // 1. 財務相關操作（存扣款紀錄）
      qb.andWhere('log.action NOT LIKE :balanceOp', { balanceOp: '%💰%存款操作%' });
      qb.andWhere('log.action NOT LIKE :deductionOp', { deductionOp: '%💰%扣款操作%' });
      
      // 2. 會員標籤操作
      qb.andWhere('log.action NOT LIKE :tagAdd', { tagAdd: '%USER_TAG_ADD%' });
      qb.andWhere('log.action NOT LIKE :tagRemove', { tagRemove: '%USER_TAG_REMOVE%' });
      
      // 3. 黑名單操作（黑名單紀錄）
      qb.andWhere('log.action NOT LIKE :blacklistMember', { blacklistMember: '%🚫 會員%黑名單%' });
      
      // 4. 會員狀態變更（會員狀態紀錄）
      qb.andWhere('log.action NOT LIKE :statusChangeMember', { statusChangeMember: '%⚡ 變更會員status%' });
      
      // 5. Banner 操作（Banner 紀錄）
      qb.andWhere('log.action NOT LIKE :bannerOp', { bannerOp: '%編輯 Banner%' });
      
      // 6. 會員資料修改（會員管理相關）
      qb.andWhere('log.action NOT LIKE :memberDataOp', { memberDataOp: '%修改會員資料%' });
      
      // 7. 跑馬燈操作（跑馬燈紀錄）
      qb.andWhere('log.action NOT LIKE :marqueeOp', { marqueeOp: '%編輯跑馬燈%' });
    }

    // 權限檢查：代理商只能查看自己公司的審計日誌
    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'GLOBAL_ADMIN') {
      qb.andWhere('user.company_id = :companyId', { companyId: currentUser.company_id });
    }

    if (from) {
      qb.andWhere('log.created_at >= :from', { from: `${from} 00:00:00` });
    }

    if (to) {
      qb.andWhere('log.created_at <= :to', { to: `${to} 23:59:59` });
    }

    if (search) {
      qb.andWhere('log.action LIKE :search', { search: `%${search}%` });
    }

    if (user) {
      qb.andWhere('user.username LIKE :user', { user: `%${user}%` });
    }

    if (ip) {
      qb.andWhere('log.ip LIKE :ip', { ip: `%${ip}%` });
    }

    if (target) {
      qb.andWhere('log.target LIKE :target', { target: `%${target}%` });
    }

    const totalCount = await qb.getCount();

    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      totalCount,
      totalPages,
    };
  }

  async create(payload: {
    action: string;
    target: string;
    targetId: number;
    user: User;
    ip: string;
    platform: string;
    snapshot: any;
  }) {
    return this.record({
      user: payload.user,
      action: payload.action,
      ip: payload.ip,
      platform: payload.platform,
      target: `${payload.target}:${payload.targetId}`,
      after: payload.snapshot,
    });
  }

  // 記錄餘額操作
  async recordBalanceOperation(payload: {
    operatorUser: User;
    targetUser: User;
    operationType: 'ADD' | 'DEDUCT' | 'ADJUST';
    beforeBalance: number;
    afterBalance: number;
    amount: number;
    reason?: string;
    ip: string;
    platform: string;
  }) {
    const {
      operatorUser,
      targetUser,
      operationType,
      beforeBalance,
      afterBalance,
      amount,
      reason,
      ip,
      platform,
    } = payload;

    const actionMap = {
      ADD: '餘額存款',
      DEDUCT: '餘額扣款',
      ADJUST: '餘額調整',
    };

    const action = `BALANCE_${operationType}`;
    const actionDescription = `${actionMap[operationType]} ${amount.toLocaleString('zh-TW')} 元${reason ? ` (${reason})` : ''}`;

    return this.record({
      user: operatorUser,
      action: actionDescription,
      ip,
      platform,
      target: `User:${targetUser.id}`,
      before: {
        balance: beforeBalance,
        username: targetUser.username,
        userId: targetUser.id,
      },
      after: {
        balance: afterBalance,
        username: targetUser.username,
        userId: targetUser.id,
      },
    });
  }

  // 分潤管理操作記錄查詢
  async findCommissionConditionLogs(params: FindCommissionConditionLogsParams) {
    const {
      currentUser,
      targetId,
      startDate,
      endDate,
      action,
      operator,
      page,
      limit,
    } = params;

    const qb = this.logRepo.createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.target LIKE :target', { target: '%CommissionCondition%' })
      .orderBy('log.created_at', 'DESC');

    // 特定分潤方案的記錄篩選
    if (targetId) {
      qb.andWhere('log.target = :specificTarget', { specificTarget: `CommissionCondition:${targetId}` });
    }

    // 權限檢查：代理商只能查看自己公司的審計日誌
    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'GLOBAL_ADMIN') {
      qb.andWhere('user.company_id = :companyId', { companyId: currentUser.company_id });
    }

    // 時間範圍篩選
    if (startDate) {
      qb.andWhere('log.created_at >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      qb.andWhere('log.created_at <= :endDate', { endDate: new Date(endDate) });
    }

    // 操作類型篩選
    if (action) {
      qb.andWhere('log.action LIKE :action', { action: `%${action}%` });
    }

    // 經手人篩選
    if (operator) {
      qb.andWhere('user.username LIKE :operator', { operator: `%${operator}%` });
    }

    const totalCount = await qb.getCount();

    const logs = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(totalCount / limit);

    // 格式化返回數據
    const items = logs.map(log => ({
      id: log.id.toString(),
      createdAt: log.created_at.toISOString(),
      operator: log.user?.username || 'Unknown',
      operatorRole: this.getUserRoleDisplayName(log.user?.role || ''),
      action: this.extractActionType(log.action),
      targetName: this.extractTargetName(log.action, log.after),
      changes: this.formatChanges(log.before, log.after),
      metadata: {
        ip: log.ip,
        platform: log.platform,
        target: log.target
      }
    }));

    return {
      items,
      total: totalCount,
      page,
      limit,
      totalPages
    };
  }

  // 提取操作類型
  private extractActionType(action: string): 'CREATE' | 'UPDATE' | 'DELETE' {
    if (action.includes('新增') || action.includes('建立') || action.includes('CREATE')) {
      return 'CREATE';
    } else if (action.includes('刪除') || action.includes('DELETE')) {
      return 'DELETE';
    } else {
      return 'UPDATE';
    }
  }

  // 提取目標名稱
  private extractTargetName(action: string, afterData: any): string {
    if (afterData && afterData.name) {
      return afterData.name;
    }
    
    // 從操作描述中嘗試提取名稱
    const match = action.match(/「(.+?)」/);
    if (match) {
      return match[1];
    }
    
    return '分潤方案';
  }

  // 格式化變更內容
  private formatChanges(before: any, after: any): Record<string, any> {
    const changes: Record<string, any> = {};
    
    if (!before && after) {
      // 新增操作
      return {
        name: after.name,
        agentId: after.agentId,
        commissionPercent: after.commissionPercent,
        systemType: after.systemType,
        settlementCycle: after.settlementCycle,
        gameRebateRates: after.gameRebateRates
      };
    }
    
    if (before && after) {
      // 更新操作 - 比較前後差異
      const fieldsToCheck = ['name', 'commissionPercent', 'systemType', 'agentLevel', 'settlementCycle', 'isActive', 'method'];
      
      // 檢查一般欄位
      fieldsToCheck.forEach(field => {
        const beforeValue = before[field];
        const afterValue = after[field];
        
        // 跳過沒有實際變更的欄位（包括 null/undefined/0 之間的轉換）
        if (this.hasActualChange(beforeValue, afterValue)) {
          changes[field] = {
            from: beforeValue,
            to: afterValue
          };
        }
      });

      // 特別處理 gameRebateRates（遊戲返水比例）
      if (before.gameRebateRates || after.gameRebateRates) {
        const beforeRates = before.gameRebateRates || {};
        const afterRates = after.gameRebateRates || {};
        
        const gameTypes = ['live', 'slot', 'sport', 'lottery', 'card', 'fishing'];
        const rateChanges: Record<string, any> = {};
        
        gameTypes.forEach(gameType => {
          const beforeValue = beforeRates[gameType] || 0;
          const afterValue = afterRates[gameType] || 0;
          
          if (beforeValue !== afterValue) {
            rateChanges[gameType] = {
              from: beforeValue,
              to: afterValue
            };
          }
        });
        
        if (Object.keys(rateChanges).length > 0) {
          changes.gameRebateRates = rateChanges;
        }
      }
    }
    
    return changes;
  }

  // 獲取角色顯示名稱
  private getUserRoleDisplayName(role: string): string {
    const roleMap: Record<string, string> = {
      'SUPER_ADMIN': '超級管理員',
      'GLOBAL_ADMIN': '全域管理員',
      'COMPANY_ADMIN': '公司管理員',
      'AGENT_OWNER': '代理商負責人',
      'AGENT_LEVEL_1': '一級代理',
      'AGENT_LEVEL_2': '二級代理',
      'AGENT_LEVEL_3': '三級代理',
      'AGENT_LEVEL_4': '四級代理',
      'AGENT_LEVEL_5': '五級代理',
      'AGENT_LEVEL_6': '六級代理',
      'AGENT_LEVEL_7': '七級代理',
      'AGENT_LEVEL_8': '八級代理',
      'AGENT_LEVEL_9': '九級代理',
      'AGENT_LEVEL_10': '十級代理',
      'AGENT_LEVEL_11': '十一級代理',
      'AGENT_LEVEL_12': '十二級代理',
      'AGENT_SUPPORT': '代理客服'
    };
    
    return roleMap[role] || role;
  }

  // 檢查是否有實際變更
  private hasActualChange(beforeValue: any, afterValue: any): boolean {
    // 如果完全相同，沒有變更
    if (beforeValue === afterValue) {
      return false;
    }
    
    // 處理數字類型的比較（包括字串數字）
    if ((typeof beforeValue === 'number' || typeof beforeValue === 'string') &&
        (typeof afterValue === 'number' || typeof afterValue === 'string')) {
      const beforeNum = parseFloat(beforeValue?.toString() || '0');
      const afterNum = parseFloat(afterValue?.toString() || '0');
      
      // 如果兩個數字相等，視為沒有變更
      if (!isNaN(beforeNum) && !isNaN(afterNum) && beforeNum === afterNum) {
        return false;
      }
    }
    
    // 處理空值的比較
    const isBeforeEmpty = beforeValue === null || beforeValue === undefined || beforeValue === '';
    const isAfterEmpty = afterValue === null || afterValue === undefined || afterValue === '';
    
    if (isBeforeEmpty && isAfterEmpty) {
      return false;
    }
    
    return true;
  }
}
