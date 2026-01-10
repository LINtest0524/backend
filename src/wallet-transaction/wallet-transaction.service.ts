import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { WalletTransaction } from './wallet-transaction.entity';
import { User } from '../user/user.entity';

@Injectable()
export class WalletTransactionService {
  constructor(
    @InjectRepository(WalletTransaction)
    private walletTransactionRepository: Repository<WalletTransaction>,
    private dataSource: DataSource,
  ) {}

  /**
   * 創建錢包交易記錄
   * @param userId 用戶ID
   * @param companyId 公司ID
   * @param transactionType 交易類型
   * @param amount 交易金額（正數為收入，負數為支出）
   * @param description 交易描述
   * @param referenceId 關聯ID
   * @param referenceType 關聯類型
   * @param ipAddress IP地址
   * @param createdBy 操作人員ID（可選）
   * @param queryRunner 事務查詢執行器（可選，用於事務處理）
   */
  async createTransaction(
    userId: number,
    companyId: number,
    transactionType: string,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string,
    ipAddress?: string,
    createdBy?: number,
    queryRunner?: any
  ): Promise<WalletTransaction> {
    // 智能判斷 manager 類型
    let manager;
    if (queryRunner) {
      // 如果 queryRunner 有 manager 屬性，則是 QueryRunner
      if (queryRunner.manager) {
        manager = queryRunner.manager;
      } else {
        // 否則直接是 EntityManager
        manager = queryRunner;
      }
    } else {
      manager = this.dataSource.manager;
    }

    // 獲取用戶當前餘額
    const user = await manager.findOne(User, { 
      where: { id: userId, company_id: companyId },
      select: ['id', 'balance']
    });

    if (!user) {
      throw new Error('用戶不存在');
    }

    const balanceBefore = user.balance || 0;
    const balanceAfter = balanceBefore + amount;

    // 創建交易記錄
    const transaction = manager.create(WalletTransaction, {
      userId,
      companyId,
      transactionType,
      amount,
      balanceBefore,
      balanceAfter,
      description,
      referenceId,
      referenceType,
      ipAddress,
      createdBy,
    });

    return await manager.save(WalletTransaction, transaction);
  }

  /**
   * 獲取用戶錢包交易記錄
   * @param userId 用戶ID
   * @param companyId 公司ID
   * @param limit 限制數量
   * @param offset 偏移量
   * @param startDate 開始日期
   * @param endDate 結束日期
   * @param transactionType 交易類型
   */
  async getUserTransactions(
    userId: number,
    companyId: number,
    limit: number = 50,
    offset: number = 0,
    startDate?: Date,
    endDate?: Date,
    transactionType?: string
  ) {
    const queryBuilder = this.walletTransactionRepository
      .createQueryBuilder('wt')
      .where('wt.userId = :userId', { userId })
      .andWhere('wt.companyId = :companyId', { companyId });

    if (startDate) {
      queryBuilder.andWhere('wt.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('wt.createdAt <= :endDate', { endDate });
    }

    if (transactionType) {
      queryBuilder.andWhere('wt.transactionType = :transactionType', { transactionType });
    }

    const [transactions, total] = await queryBuilder
      .orderBy('wt.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return {
      transactions,
      total,
      limit,
      offset,
    };
  }

  /**
   * 獲取所有用戶的錢包交易記錄（管理員用）
   * @param companyId 公司ID
   * @param page 頁碼
   * @param limit 每頁數量
   * @param startDate 開始日期
   * @param endDate 結束日期
   * @param transactionType 交易類型
   * @param userId 指定用戶ID
   * @param search 搜尋描述
   * @param minAmount 最小金額
   * @param maxAmount 最大金額
   * @param user 用戶名搜尋
   */
  async getAllTransactions(
    companyId: number,
    page: number = 1,
    limit: number = 20,
    startDate?: Date,
    endDate?: Date,
    transactionType?: string,
    userId?: number,
    search?: string,
    minAmount?: number,
    maxAmount?: number,
    user?: string
  ) {
    const queryBuilder = this.walletTransactionRepository
      .createQueryBuilder('wt')
      .leftJoinAndSelect('wt.user', 'user')
      .where('wt.companyId = :companyId', { companyId });

    if (startDate) {
      queryBuilder.andWhere('wt.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('wt.createdAt <= :endDate', { endDate });
    }

    if (transactionType) {
      queryBuilder.andWhere('wt.transactionType = :transactionType', { transactionType });
    }

    if (userId) {
      queryBuilder.andWhere('wt.userId = :userId', { userId });
    }

    if (search) {
      queryBuilder.andWhere('wt.description LIKE :search', { search: `%${search}%` });
    }

    if (minAmount !== undefined && minAmount !== null) {
      queryBuilder.andWhere('ABS(wt.amount) >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined && maxAmount !== null) {
      queryBuilder.andWhere('ABS(wt.amount) <= :maxAmount', { maxAmount });
    }

    if (user) {
      queryBuilder.andWhere('user.username LIKE :user', { user: `%${user}%` });
    }

    const offset = (page - 1) * limit;

    const [transactions, total] = await queryBuilder
      .orderBy('wt.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return {
      data: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 獲取用戶錢包交易統計
   * @param userId 用戶ID
   * @param companyId 公司ID
   * @param startDate 開始日期
   * @param endDate 結束日期
   */
  async getUserTransactionStats(
    userId: number,
    companyId: number,
    startDate?: Date,
    endDate?: Date
  ) {
    const queryBuilder = this.walletTransactionRepository
      .createQueryBuilder('wt')
      .select([
        'SUM(CASE WHEN wt.amount > 0 THEN wt.amount ELSE 0 END) as totalIncome',
        'SUM(CASE WHEN wt.amount < 0 THEN ABS(wt.amount) ELSE 0 END) as totalExpense',
        'COUNT(*) as totalTransactions'
      ])
      .where('wt.userId = :userId', { userId })
      .andWhere('wt.companyId = :companyId', { companyId });

    if (startDate) {
      queryBuilder.andWhere('wt.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('wt.createdAt <= :endDate', { endDate });
    }

    const result = await queryBuilder.getRawOne();
    
    return {
      totalIncome: result?.totalIncome || '0',
      totalExpense: result?.totalExpense || '0', 
      totalTransactions: result?.totalTransactions || '0'
    };
  }

  /**
   * 獲取管理員存扣款操作記錄
   * @param companyId 公司ID
   * @param page 頁碼
   * @param limit 每頁數量
   * @param startDate 開始日期
   * @param endDate 結束日期
   * @param transactionType 交易類型
   * @param operator 操作員
   * @param targetUser 目標用戶
   * @param search 搜尋關鍵字
   */
  async getAdminOperations(
    companyId: number,
    page: number = 1,
    limit: number = 20,
    startDate?: Date,
    endDate?: Date,
    transactionType?: string,
    operator?: string,
    targetUser?: string,
    search?: string
  ) {
    const queryBuilder = this.walletTransactionRepository
      .createQueryBuilder('wt')
      .leftJoinAndSelect('wt.user', 'user')
      .andWhere('wt.transactionType IN (:...adminTypes)', { 
        adminTypes: ['admin_deposit', 'admin_deduction'] 
      });
    
    // 如果有 companyId，才加上公司過濾條件（SUPER_ADMIN 的 companyId 是 null，應該看到所有公司）
    if (companyId !== null && companyId !== undefined) {
      queryBuilder.andWhere('wt.companyId = :companyId', { companyId });
    }

    if (startDate) {
      queryBuilder.andWhere('wt.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('wt.createdAt <= :endDate', { endDate });
    }

    if (transactionType) {
      queryBuilder.andWhere('wt.transactionType = :transactionType', { transactionType });
    }

    if (targetUser) {
      queryBuilder.andWhere('user.username LIKE :targetUser', { targetUser: `%${targetUser}%` });
    }

    if (search) {
      queryBuilder.andWhere('wt.description LIKE :search', { search: `%${search}%` });
    }

    const offset = (page - 1) * limit;
    const [transactions, totalCount] = await queryBuilder
      .orderBy('wt.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    // 獲取操作員信息
    const operatorIds = transactions
      .map(t => t.createdBy)
      .filter(id => id !== null && id !== undefined);

    let operators: User[] = [];
    if (operatorIds.length > 0) {
      const uniqueOperatorIds = [...new Set(operatorIds)];
      operators = await this.dataSource.manager.find(User, {
        where: { id: In(uniqueOperatorIds) },
        select: ['id', 'username']
      });
    }

    // 應用操作員篩選
    let filteredTransactions = transactions;
    if (operator) {
      const filteredOperatorIds = operators
        .filter(op => op.username.includes(operator))
        .map(op => op.id);
      
      filteredTransactions = transactions.filter(t => 
        t.createdBy && filteredOperatorIds.includes(t.createdBy)
      );
    }

    // 組裝最終結果
    const enhancedTransactions = filteredTransactions.map(transaction => {
      const operatorInfo = operators.find(op => op.id === transaction.createdBy);
      return {
        ...transaction,
        operator: operatorInfo ? {
          id: operatorInfo.id,
          username: operatorInfo.username
        } : null
      };
    });

    return {
      data: enhancedTransactions,
      totalCount: operator ? enhancedTransactions.length : totalCount,
      totalPages: Math.ceil((operator ? enhancedTransactions.length : totalCount) / limit),
      page,
      limit
    };
  }
}