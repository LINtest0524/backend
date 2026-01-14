import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameWager } from '../entities/game-wager.entity';
import { UserService } from '../../user/user.service';
import { WalletTransactionService } from '../../wallet-transaction/wallet-transaction.service';
import { SeamlessWalletCode, TransactionActionType } from '../constants/gsc.constants';
// 不再需要分/元轉換，直接使用元
import {
  BalanceDataDto,
  WithdrawDataDto,
  DepositDataDto,
  BatchRequestItemDto,
  TransactionDto,
  WagerDto,
} from '../dto';

@Injectable()
export class GameProviderGscService {
  private readonly logger = new Logger(GameProviderGscService.name);

  constructor(
    @InjectRepository(GameWager)
    private readonly gameWagerRepository: Repository<GameWager>,
    private readonly userService: UserService,
    private readonly walletTransactionService: WalletTransactionService,
  ) {}

  /**
   * 處理 Balance 請求
   */
  async handleBalance(
    batchRequests: BatchRequestItemDto[],
  ): Promise<BalanceDataDto[]> {
    this.logger.log(`[Balance] Processing ${batchRequests.length} requests`);

    const results: BalanceDataDto[] = [];

    for (const request of batchRequests) {
      try {
        // 根據 username 查找用戶
        const user = await this.userService.findOneByUsername(
          request.member_account,
        );

        if (!user) {
          this.logger.error(
            `[Balance] User not found: ${request.member_account}`,
          );
          results.push({
            member_account: request.member_account,
            product_code: request.product_code,
            balance: 0,
            code: SeamlessWalletCode.MEMBER_NOT_EXIST,
            message: 'Member not found',
          });
          continue;
        }

        // 直接使用餘額（元），格式化為小數點後2位
        const balance = parseFloat((Number(user.balance) || 0).toFixed(2));

        this.logger.log(
          `[Balance] User: ${request.member_account}, Balance: ${balance} TWD`,
        );

        results.push({
          member_account: request.member_account,
          product_code: request.product_code,
          balance,
          code: SeamlessWalletCode.SUCCESS,
          message: '',
        });
      } catch (error) {
        this.logger.error(
          `[Balance] Error processing request for ${request.member_account}:`,
          error,
        );
        results.push({
          member_account: request.member_account,
          product_code: request.product_code,
          balance: 0,
          code: SeamlessWalletCode.INTERNAL_ERROR,
          message: 'Internal error',
        });
      }
    }

    return results;
  }

  /**
   * 處理 Withdraw 請求 (下注扣款)
   */
  async handleWithdraw(
    batchRequests: BatchRequestItemDto[],
  ): Promise<WithdrawDataDto[]> {
    this.logger.log(`[Withdraw] Processing ${batchRequests.length} requests`);

    const results: WithdrawDataDto[] = [];

    for (const request of batchRequests) {
      try {
        // 根據 username 查找用戶
        const user = await this.userService.findOneByUsername(
          request.member_account,
        );

        if (!user) {
          this.logger.error(
            `[Withdraw] User not found: ${request.member_account}`,
          );
          results.push({
            member_account: request.member_account,
            product_code: request.product_code,
            before_balance: 0,
            balance: 0,
            code: SeamlessWalletCode.MEMBER_NOT_EXIST,
            message: 'Member not found',
          });
          continue;
        }

        // 處理交易
        for (const transaction of request.transactions || []) {
          const result = await this.processWithdrawTransaction(
            user.id,
            request.member_account,
            request.product_code,
            transaction,
          );

          if (result) {
            results.push(result);
          }
        }
      } catch (error) {
        this.logger.error(
          `[Withdraw] Error processing request for ${request.member_account}:`,
          error,
        );
        results.push({
          member_account: request.member_account,
          product_code: request.product_code,
          before_balance: 0,
          balance: 0,
          code: SeamlessWalletCode.INTERNAL_ERROR,
          message: 'Internal error',
        });
      }
    }

    return results;
  }

  /**
   * 處理單筆 Withdraw 交易
   */
  private async processWithdrawTransaction(
    userId: number,
    memberAccount: string,
    productCode: number,
    transaction: TransactionDto,
  ): Promise<WithdrawDataDto | null> {
    // TODO: 檢查交易是否已存在 (冪等性) - 需要在 WalletTransactionService 實作 findByReferenceId
    // const existingTxn = await this.walletTransactionService.findByReferenceId(
    //   transaction.id,
    // );

    // if (existingTxn) {
    //   this.logger.warn(
    //     `[Withdraw] Duplicate transaction detected: ${transaction.id}`,
    //   );

    //   const user = await this.userService.findById(userId);
    //   const balance = centsToYuan(user.balance);

    //   return {
    //     member_account: memberAccount,
    //     product_code: productCode,
    //     before_balance: balance,
    //     balance,
    //     code: SeamlessWalletCode.DUPLICATE_TRANSACTION,
    //     message: 'Duplicate transaction',
    //   };
    // }

    // 金額已經是元，直接使用（支援小數點後2位）
    const amountInYuan = parseFloat(Math.abs(transaction.amount).toFixed(2));

    // 檢查餘額
    const user = await this.userService.findById(userId);
    const currentBalance = Number(user.balance) || 0;
    
    if (currentBalance < amountInYuan) {
      this.logger.error(
        `[Withdraw] Insufficient balance: User ${memberAccount}, Required: ${amountInYuan}, Available: ${currentBalance}`,
      );

      return {
        member_account: memberAccount,
        product_code: productCode,
        before_balance: parseFloat(currentBalance.toFixed(2)),
        balance: parseFloat(currentBalance.toFixed(2)),
        code: SeamlessWalletCode.INSUFFICIENT_BALANCE,
        message: 'Insufficient balance',
      };
    }

    const beforeBalance = currentBalance;

    // 扣款 - 直接設定新餘額（系統內部操作，不需要權限檢查）
    const newBalance = parseFloat((currentBalance - amountInYuan).toFixed(2));
    await this.userService.setUserBalance(userId, newBalance);

    // 記錄日誌
    this.logger.log(
      `[Withdraw] User ${memberAccount}: ${beforeBalance} -> ${newBalance} (deduct ${amountInYuan} yuan)`,
    );

    // 獲取扣款後餘額
    const updatedUser = await this.userService.findById(userId);
    const updatedBalance = Number(updatedUser.balance) || 0;

    this.logger.log(
      `[Withdraw] Success: ${memberAccount}, Amount: ${transaction.amount}, Before: ${beforeBalance.toFixed(2)}, After: ${updatedBalance.toFixed(2)}`,
    );

    return {
      member_account: memberAccount,
      product_code: productCode,
      before_balance: parseFloat(beforeBalance.toFixed(2)),
      balance: parseFloat(updatedBalance.toFixed(2)),
      code: SeamlessWalletCode.SUCCESS,
      message: '',
    };
  }

  /**
   * 處理 Deposit 請求 (中獎入款)
   */
  async handleDeposit(
    batchRequests: BatchRequestItemDto[],
  ): Promise<DepositDataDto[]> {
    this.logger.log(`[Deposit] Processing ${batchRequests.length} requests`);

    const results: DepositDataDto[] = [];

    for (const request of batchRequests) {
      try {
        // 根據 username 查找用戶
        const user = await this.userService.findOneByUsername(
          request.member_account,
        );

        if (!user) {
          this.logger.error(
            `[Deposit] User not found: ${request.member_account}`,
          );
          results.push({
            member_account: request.member_account,
            product_code: request.product_code,
            before_balance: 0,
            balance: 0,
            code: SeamlessWalletCode.MEMBER_NOT_EXIST,
            message: 'Member not found',
          });
          continue;
        }

        // 處理交易
        for (const transaction of request.transactions || []) {
          const result = await this.processDepositTransaction(
            user.id,
            request.member_account,
            request.product_code,
            transaction,
          );

          if (result) {
            results.push(result);
          }
        }
      } catch (error) {
        this.logger.error(
          `[Deposit] Error processing request for ${request.member_account}:`,
          error,
        );
        results.push({
          member_account: request.member_account,
          product_code: request.product_code,
          before_balance: 0,
          balance: 0,
          code: SeamlessWalletCode.INTERNAL_ERROR,
          message: 'Internal error',
        });
      }
    }

    return results;
  }

  /**
   * 處理單筆 Deposit 交易
   */
  private async processDepositTransaction(
    userId: number,
    memberAccount: string,
    productCode: number,
    transaction: TransactionDto,
  ): Promise<DepositDataDto | null> {
    // TODO: 檢查交易是否已存在 (冪等性) - 需要在 WalletTransactionService 實作 findByReferenceId
    // const existingTxn = await this.walletTransactionService.findByReferenceId(
    //   transaction.id,
    // );

    // if (existingTxn) {
    //   this.logger.warn(
    //     `[Deposit] Duplicate transaction detected: ${transaction.id}`,
    //   );

    //   const user = await this.userService.findById(userId);
    //   const balance = centsToYuan(user.balance);

    //   return {
    //     member_account: memberAccount,
    //     product_code: productCode,
    //     before_balance: balance,
    //     balance,
    //     code: SeamlessWalletCode.DUPLICATE_TRANSACTION,
    //     message: 'Duplicate transaction',
    //   };
    // }

    // 金額已經是元，直接使用（支援小數點後2位）
    const amountInYuan = parseFloat(Math.abs(transaction.amount).toFixed(2));

    const user = await this.userService.findById(userId);
    const beforeBalance = Number(user.balance) || 0;

    // 入款 - 直接設定新餘額（系統內部操作，不需要權限檢查）
    const newBalance = parseFloat((beforeBalance + amountInYuan).toFixed(2));
    await this.userService.setUserBalance(userId, newBalance);

    // 記錄日誌
    this.logger.log(
      `[Deposit] User ${memberAccount}: ${beforeBalance} -> ${newBalance} (add ${amountInYuan} yuan)`,
    );

    // 獲取入款後餘額
    const updatedUser = await this.userService.findById(userId);
    const updatedBalance = Number(updatedUser.balance) || 0;

    this.logger.log(
      `[Deposit] Success: ${memberAccount}, Amount: ${transaction.amount}, Before: ${beforeBalance.toFixed(2)}, After: ${updatedBalance.toFixed(2)}`,
    );

    return {
      member_account: memberAccount,
      product_code: productCode,
      before_balance: parseFloat(beforeBalance.toFixed(2)),
      balance: parseFloat(updatedBalance.toFixed(2)),
      code: SeamlessWalletCode.SUCCESS,
      message: '',
    };
  }

  /**
   * 處理 Push Bet Data 請求 (注單推送)
   */
  async handlePushBetData(wagers: WagerDto[]): Promise<void> {
    this.logger.log(`[PushBetData] Processing ${wagers.length} wagers`);

    for (const wager of wagers) {
      try {
        // 檢查注單是否已存在
        const existingWager = await this.gameWagerRepository.findOne({
          where: { wagerCode: wager.wager_code },
        });

        if (existingWager) {
          this.logger.warn(
            `[PushBetData] Wager already exists: ${wager.wager_code}`,
          );
          continue;
        }

        // 查找用戶
        const user = await this.userService.findOneByUsername(
          wager.member_account,
        );

        if (!user) {
          this.logger.error(
            `[PushBetData] User not found: ${wager.member_account}`,
          );
          continue;
        }

        // 保存注單
        const gameWager = this.gameWagerRepository.create({
          userId: user.id,
          agentId: user.parent_agent_id ?? undefined, // 記錄上級代理 ID
          companyId: user.company_id ?? 1, // 如果沒有 company_id，預設為 1
          wagerCode: wager.wager_code,
          roundId: wager.round_id ?? '',
          gameCode: wager.game_code,
          productCode: parseInt(wager.product_code, 10),
          gameType: wager.game_type,
          currency: wager.currency,
          betAmount: parseFloat(wager.bet_amount.toFixed(2)),
          validBetAmount: parseFloat(wager.valid_bet_amount.toFixed(2)),
          prizeAmount: parseFloat(wager.prize_amount.toFixed(2)),
          tipAmount: parseFloat(wager.tip_amount.toFixed(2)),
          wagerStatus: wager.wager_status,
          wagerType: wager.wager_type ?? 'NORMAL',
          channelCode: wager.channel_code ?? '',
          payload: wager.payload ?? {},
          settledAt: wager.settled_at ?? undefined,
        });

        await this.gameWagerRepository.save(gameWager);

        this.logger.log(
          `[PushBetData] Wager saved: ${wager.wager_code}, User: ${wager.member_account}, Bet: ${wager.bet_amount}, Prize: ${wager.prize_amount}`,
        );
      } catch (error) {
        this.logger.error(
          `[PushBetData] Error processing wager ${wager.wager_code}:`,
          error,
        );
      }
    }
  }
}
