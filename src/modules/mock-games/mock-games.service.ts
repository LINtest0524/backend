import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import {
  BalanceResponseDto,
  BetResultDto,
  Currency,
  GamesResponseDto,
  PlaceBetDto,
  SessionRequestDto,
  SessionResponseDto,
  SettleResponseDto,
} from './dto';
import { MockGamesRepository, BetTxnData, RoundResultData } from './mock-games.repository';
import { UserService } from '../../user/user.service';

type Session = {
  token: string;
  playerId: string;
  currency: Currency;
  expiredAt: number;
};

type Wallet = {
  playerId: string;
  currency: Currency;
  balance: number;
};

type PendingRound = {
  roundId: string;
  gameId: 'HI_LO' | 'DICE';
  playerId: string;
  betAmount: number;
  betPayload: any;
  txnId: string;        // 系統產生的下注交易號
  clientTxnId?: string; // 用戶端傳入的幂等 ID（可選）
  createdAt: number;    // 建立時間，用於清理過期記錄
};

const RNG = () => Math.random();

@Injectable()
export class MockGamesService {
  private sessions = new Map<string, Session>();
  private wallets = new Map<string, Wallet>();
  private pending = new Map<string, PendingRound>();              // 尚未結算的回合
  private processedBetTxns = new Map<string, string>();           // clientTxnId -> roundId 映射
  private settledRounds = new Map<string, SettleResponseDto>();   // 已結算的回合回傳快取
  
  constructor(
    private readonly repository: MockGamesRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {
    // 定期清理過期的資料（每5分鐘執行一次）
    setInterval(() => this.cleanupExpiredData(), 5 * 60 * 1000);
  }

  private cleanupExpiredData() {
    const now = Date.now();
    const expireTime = 30 * 60 * 1000; // 30分鐘過期
    
    // 清理過期 session
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiredAt < now) {
        this.sessions.delete(token);
      }
    }
    
    // 清理過期的待結算回合（超過30分鐘）
    for (const [roundId, round] of this.pending.entries()) {
      if (now - round.createdAt > expireTime) {
        this.pending.delete(roundId);
      }
    }
    
    // 清理過期的已結算記錄（保留1小時）
    // 這裡簡化處理，實際應用中可能需要更複雜的清理策略
  }

  getGames(): GamesResponseDto {
    return {
      items: [
        { gameId: 'HI_LO', gameName: '猜大小（Hi-Lo）', category: 'TABLE', status: 'ONLINE' },
        { gameId: 'DICE',  gameName: '骰子（簡化版）',   category: 'TABLE', status: 'ONLINE' },
      ],
    };
  }

  createOrGetSession(dto: SessionRequestDto): SessionResponseDto {
    const token = `sess_${dto.playerId}_${Date.now()}`;
    const currency: Currency = dto.currency ?? 'TWD';
    const expiredAt = Date.now() + 1000 * 60 * 30; // 30 分鐘
    this.sessions.set(token, { token, playerId: dto.playerId, currency, expiredAt });

    if (!this.wallets.has(dto.playerId)) {
      this.wallets.set(dto.playerId, { playerId: dto.playerId, currency, balance: 1000 }); // 初始 1000
    }

    return {
      sessionToken: token,
      playerId: dto.playerId,
      currency,
      expiredAt: new Date(expiredAt).toISOString(),
    };
  }

  async getBalance(sessionToken: string): Promise<BalanceResponseDto> {
    const s = this.sessions.get(sessionToken);
    if (!s) throw new BadRequestException({ code: 'INVALID_SESSION', message: 'SessionToken 無效或已過期' });
    
    // 檢查 session 是否過期
    if (s.expiredAt < Date.now()) {
      this.sessions.delete(sessionToken);
      throw new BadRequestException({ code: 'SESSION_EXPIRED', message: 'Session 已過期，請重新登入' });
    }

    try {
      // 根據 playerId 獲取用戶真實餘額
      const user = await this.userService.findOneByUsername(s.playerId);
      if (!user) {
        throw new BadRequestException({ code: 'USER_NOT_FOUND', message: '找不到用戶資料' });
      }
      
      console.log(`[MOCK-GAMES] getBalance - 用戶 ${s.playerId} 餘額: ${user.balance}, 用戶資料:`, {
        id: user.id,
        username: user.username,
        balance: user.balance,
        created_at: user.created_at
      });
      
      // 直接使用用戶真實餘額，如果為空則顯示為 0
      let userBalance = user.balance || 0;
      console.log(`[MOCK-GAMES] 用戶 ${s.playerId} 真實餘額: ${userBalance}`);
      
      return { 
        playerId: s.playerId, 
        balance: userBalance, 
        currency: s.currency 
      };
    } catch (error) {
      console.error('獲取用戶餘額失敗:', error);
      throw new BadRequestException({ code: 'BALANCE_ERROR', message: '無法獲取餘額' });
    }
  }

  async placeBet(dto: PlaceBetDto & { clientTxnId?: string }): Promise<BetResultDto> {
    const s = this.sessions.get(dto.sessionToken);
    if (!s) throw new BadRequestException({ code: 'INVALID_SESSION', message: 'SessionToken 無效或已過期' });
    
    // 檢查 session 是否過期
    if (s.expiredAt < Date.now()) {
      this.sessions.delete(dto.sessionToken);
      throw new BadRequestException({ code: 'SESSION_EXPIRED', message: 'Session 已過期，請重新登入' });
    }

    // 檢查回合是否已存在
    if (this.pending.has(dto.roundId) || this.settledRounds.has(dto.roundId)) {
      throw new BadRequestException({ code: 'ROUND_ALREADY_EXISTS', message: '回合 ID 已存在，請使用不同的 roundId' });
    }

    const clientTxnId = dto.clientTxnId?.trim();
    
    // 幂等性檢查：如果 clientTxnId 已處理過，直接回傳成功但不重複扣款
    if (clientTxnId && this.processedBetTxns.has(clientTxnId)) {
      const existingRoundId = this.processedBetTxns.get(clientTxnId)!;
      // 獲取當前用戶真實餘額
      const currentUser = await this.userService.findOneByUsername(s.playerId);
      return { 
        status: 'ACCEPTED', 
        roundId: existingRoundId, 
        txnId: `idempotent_${clientTxnId}`, 
        balanceAfter: currentUser?.balance || 0 
      };
    }

    // 獲取用戶真實餘額並扣款
    const user = await this.userService.findOneByUsername(s.playerId);
    if (!user) {
      throw new BadRequestException({ code: 'USER_NOT_FOUND', message: '找不到用戶資料' });
    }

    console.log(`[MOCK-GAMES] 用戶 ${s.playerId} 當前餘額: ${user.balance}, 下注金額: ${dto.betAmount}`);

    if (dto.betAmount <= 0) throw new BadRequestException({ code: 'INVALID_AMOUNT', message: '下注金額需大於 0' });
    if ((user.balance || 0) < dto.betAmount) {
      console.log(`[MOCK-GAMES] 餘額不足 - 用戶餘額: ${user.balance}, 下注金額: ${dto.betAmount}`);
      throw new BadRequestException({ code: 'INSUFFICIENT_FUNDS', message: '餘額不足，無法下注' });
    }

    // 驗證遊戲參數
    if (!['HI_LO', 'DICE'].includes(dto.gameId)) {
      throw new BadRequestException({ code: 'INVALID_GAME', message: '不支援的遊戲類型' });
    }

    const txnId = `bet_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();
    
    // 記錄下注前的餘額，實際扣款在結算時進行
    const originalBalance = user.balance || 0;
    console.log(`[MOCK-GAMES] 下注記錄 - 用戶 ${s.playerId} 原始餘額: ${originalBalance}, 下注金額: ${dto.betAmount}`);

    this.pending.set(dto.roundId, {
      roundId: dto.roundId,
      gameId: dto.gameId,
      playerId: s.playerId,
      betAmount: dto.betAmount,
      betPayload: dto.betPayload,
      txnId,
      clientTxnId: clientTxnId || undefined,
      createdAt: Date.now(),
    });

    // 記錄 clientTxnId 對應的 roundId
    if (clientTxnId) {
      this.processedBetTxns.set(clientTxnId, dto.roundId);
    }

    const result: BetResultDto = { status: 'ACCEPTED', roundId: dto.roundId, txnId, balanceAfter: originalBalance };

    // 異步寫入資料庫（不影響回應）
    this.saveBetTxnToDb({
      playerId: s.playerId,
      roundId: dto.roundId,
      gameId: dto.gameId,
      betAmount: dto.betAmount,
      betPayload: dto.betPayload,
      clientTxnId: clientTxnId || undefined,
      sessionToken: dto.sessionToken,
      txnId,
      processingTimeMs: Date.now() - startTime,
    }).catch(err => {
      console.warn('[MOCK-GAMES:DB] Failed to save bet transaction:', err.message);
    });

    return result;
  }

  async settle(roundId: string): Promise<SettleResponseDto> {
    // 防重複結算：若已結算，直接回傳快取結果
    const cached = this.settledRounds.get(roundId);
    if (cached) {
      return cached;
    }

    const p = this.pending.get(roundId);
    if (!p) throw new BadRequestException({ code: 'ROUND_NOT_FOUND', message: '回合不存在或已結算' });

    let winAmount = 0;
    let result: any = {};

    try {
      if (p.gameId === 'HI_LO') {
        // 驗證 Hi-Lo 遊戲參數
        const choice = p.betPayload?.choice as 'HIGH' | 'LOW';
        if (!choice || !['HIGH', 'LOW'].includes(choice)) {
          throw new BadRequestException({ code: 'INVALID_BET_PAYLOAD', message: 'Hi-Lo 遊戲需要有效的 choice 參數' });
        }

        const card = Math.floor(RNG() * 13) + 1; // 1..13
        const outcome = card >= 8 ? 'HIGH' : (card <= 6 ? 'LOW' : 'MID'); // 7 為莊贏
        
        if ((choice === 'HIGH' && outcome === 'HIGH') || (choice === 'LOW' && outcome === 'LOW')) {
          winAmount = p.betAmount * 1; // 1:1 賠率，獎金等於下注金額
        } else {
          winAmount = 0;
        }
        result = { card, outcome };

      } else if (p.gameId === 'DICE') {
        const d1 = Math.floor(RNG() * 6) + 1;
        const d2 = Math.floor(RNG() * 6) + 1;
        const d3 = Math.floor(RNG() * 6) + 1;
        const sum = d1 + d2 + d3;

        const choice = p.betPayload?.choice as 'BIG' | 'SMALL' | undefined;
        const pickSum = p.betPayload?.sum as number | undefined;

        // 驗證骰子遊戲參數
        if (typeof pickSum === 'number') {
          // 指定點數模式
          if (pickSum < 3 || pickSum > 18) {
            throw new BadRequestException({ code: 'INVALID_BET_PAYLOAD', message: '指定點數必須在 3-18 之間' });
          }
          winAmount = sum === pickSum ? p.betAmount * 10 : 0; // 1:10 賠率，獎金為下注金額的10倍
        } else if (choice) {
          // 大小模式
          if (!['BIG', 'SMALL'].includes(choice)) {
            throw new BadRequestException({ code: 'INVALID_BET_PAYLOAD', message: '大小模式需要有效的 choice 參數（BIG/SMALL）' });
          }
          
          let outcome: 'BIG' | 'SMALL' | 'HOUSE';
          if (sum <= 3 || sum >= 18) outcome = 'HOUSE';
          else if (sum >= 11) outcome = 'BIG';
          else outcome = 'SMALL';

          if ((choice === 'BIG' && outcome === 'BIG') || (choice === 'SMALL' && outcome === 'SMALL')) {
            winAmount = p.betAmount * 1; // 1:1 賠率，獎金等於下注金額
          } else {
            winAmount = 0;
          }
        } else {
          throw new BadRequestException({ code: 'INVALID_BET_PAYLOAD', message: '骰子遊戲需要 choice 或 sum 參數' });
        }

        result = { dice: [d1, d2, d3], sum };

      } else {
        throw new BadRequestException({ code: 'GAME_NOT_SUPPORTED', message: '不支援的遊戲類型' });
      }

      // 派彩處理 - 使用簡潔算式
      const user = await this.userService.findOneByUsername(p.playerId);
      if (!user) {
        throw new BadRequestException({ code: 'USER_NOT_FOUND', message: '找不到用戶資料' });
      }

      const startTime = Date.now();
      const originalBalance = user.balance || 0;
      let finalBalance;
      
      if (winAmount > 0) {
        // 贏了：初始本金 + (下注金額 × 倍數)
        // winAmount 已經是 (下注金額 × 倍數) 的結果
        finalBalance = originalBalance + winAmount;
        await this.userService.setUserBalance(user.id, finalBalance);
        console.log(`[MOCK-GAMES] 獲勝！用戶 ${p.playerId} 餘額: ${originalBalance} + (${p.betAmount} × 倍數) = ${finalBalance}`);
      } else {
        // 輸了：初始本金 - 下注金額
        finalBalance = originalBalance - p.betAmount;
        await this.userService.setUserBalance(user.id, finalBalance);
        console.log(`[MOCK-GAMES] 失敗！用戶 ${p.playerId} 餘額: ${originalBalance} - ${p.betAmount} = ${finalBalance}`);
      }
      
      // 重新獲取最新餘額以確保準確性
      const updatedUser = await this.userService.findOneByUsername(p.playerId);
      finalBalance = updatedUser?.balance || finalBalance;

      // 清除待結算記錄
      this.pending.delete(roundId);

      // 建立結算回應並快取
      const response: SettleResponseDto = {
        roundId: p.roundId,
        result,
        winAmount,
        balanceAfter: finalBalance,
        finished: true,
      };

      this.settledRounds.set(roundId, response);

      // 計算報表用的派彩金額
      let payoutAmount = 0;
      if (winAmount > 0) {
        // 贏了：派彩 = 本金 + 獎金
        payoutAmount = p.betAmount + winAmount;
        console.log(`[MOCK-GAMES] 派彩計算 - 下注:${p.betAmount} + 獎金:${winAmount} = 派彩:${payoutAmount}`);
      } else {
        // 輸了：派彩 = 0
        payoutAmount = 0;
        console.log(`[MOCK-GAMES] 派彩計算 - 輸了，派彩:${payoutAmount}`);
      }

      // 異步寫入資料庫（不影響回應）
      this.saveRoundResultToDb({
        playerId: p.playerId,
        roundId: p.roundId,
        gameId: p.gameId,
        result,
        winAmount: payoutAmount, // 保存派彩金額而不是獎金
        balanceAfter: finalBalance,
        betAmount: p.betAmount,
        processingTimeMs: Date.now() - startTime,
      }).catch(err => {
        console.warn('[MOCK-GAMES:DB] Failed to save round result:', err.message);
      });

      return response;

    } catch (error) {
      // 如果結算過程中發生錯誤，需要回滾餘額變更
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({ code: 'SETTLE_ERROR', message: '結算過程發生錯誤' });
    }
  }

  // 私有方法：異步保存下注記錄
  private async saveBetTxnToDb(data: BetTxnData): Promise<void> {
    try {
      await this.repository.saveBetTxn(data);
    } catch (error) {
      // 靜默失敗，不影響業務邏輯
      console.warn('[MOCK-GAMES:DB] Database save bet failed:', error.message);
      throw error; // 重新拋出讓調用者處理
    }
  }

  // 私有方法：異步保存結算記錄
  private async saveRoundResultToDb(data: RoundResultData): Promise<void> {
    try {
      await this.repository.saveRoundResult(data);
    } catch (error) {
      // 靜默失敗，不影響業務邏輯
      console.warn('[MOCK-GAMES:DB] Database save round result failed:', error.message);
      throw error; // 重新拋出讓調用者處理
    }
  }

  // 公開方法：查詢下注歷史
  async getBetHistory(playerId: string | null, limit: number = 20, gameId?: string, status?: string, dateFrom?: string, dateTo?: string) {
    try {
      // 處理日期參數
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (dateFrom) {
        startDate = new Date(dateFrom);
        if (isNaN(startDate.getTime())) {
          startDate = undefined;
        }
      }
      
      if (dateTo) {
        endDate = new Date(dateTo);
        if (isNaN(endDate.getTime())) {
          endDate = undefined;
        }
      }

      return await this.repository.getBetHistory({
        playerId,
        limit,
        gameId,
        status,
        startDate,
        endDate,
      });
    } catch (error) {
      console.warn('[MOCK-GAMES:DB] Failed to get bet history:', error.message);
      return { items: [], total: 0 };
    }
  }

  // 公開方法：查詢結算歷史
  async getRoundHistory(playerId: string | null, limit: number = 20, gameId?: string, finished?: string, dateFrom?: string, dateTo?: string) {
    try {
      // 處理日期參數
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (dateFrom) {
        startDate = new Date(dateFrom);
        if (isNaN(startDate.getTime())) {
          startDate = undefined;
        }
      }
      
      if (dateTo) {
        endDate = new Date(dateTo);
        if (isNaN(endDate.getTime())) {
          endDate = undefined;
        }
      }

      // 處理 finished 參數
      let finishedFilter: boolean | undefined;
      if (finished === 'true') {
        finishedFilter = true;
      } else if (finished === 'false') {
        finishedFilter = false;
      }

      return await this.repository.getRoundHistory({
        playerId,
        limit,
        gameId,
        finished: finishedFilter,
        startDate,
        endDate,
      });
    } catch (error) {
      console.warn('[MOCK-GAMES:DB] Failed to get round history:', error.message);
      return { items: [], total: 0 };
    }
  }

  // 公開方法：查詢玩家統計
  async getPlayerStats(playerId: string, gameId?: string) {
    try {
      return await this.repository.getPlayerStats(playerId, gameId);
    } catch (error) {
      console.warn('[MOCK-GAMES:DB] Failed to get player stats:', error.message);
      return {
        totalBets: 0,
        totalBetAmount: 0,
        totalWinAmount: 0,
        totalRounds: 0,
        winRate: 0,
      };
    }
  }

  // 清理指定玩家的所有模擬資料
  async clearPlayerData(playerId: string) {
    try {
      // 清理記憶體中的資料
      this.wallets.delete(playerId);
      
      // 清理 session
      for (const [token, session] of this.sessions.entries()) {
        if (session.playerId === playerId) {
          this.sessions.delete(token);
        }
      }
      
      // 清理待結算的回合
      for (const [roundId, round] of this.pending.entries()) {
        if (round.playerId === playerId) {
          this.pending.delete(roundId);
        }
      }
      
      // 清理已結算記錄
      for (const [roundId, result] of this.settledRounds.entries()) {
        // 需要透過資料庫查詢來確認這個 roundId 是否屬於該玩家
        const roundResult = await this.repository.findRoundResult(roundId);
        if (roundResult && roundResult.playerId === playerId) {
          this.settledRounds.delete(roundId);
        }
      }
      
      // 清理幂等性記錄（需要查詢資料庫來確認）
      for (const [clientTxnId, roundId] of this.processedBetTxns.entries()) {
        const roundResult = await this.repository.findRoundResult(roundId);
        if (roundResult && roundResult.playerId === playerId) {
          this.processedBetTxns.delete(clientTxnId);
        }
      }
      
      // 清理資料庫中的資料
      await this.repository.clearPlayerData(playerId);
      
      return { success: true, message: `已清理玩家 ${playerId} 的所有模擬資料` };
    } catch (error) {
      console.error('[MOCK-GAMES] Failed to clear player data:', error.message);
      return { success: false, message: `清理玩家資料失敗: ${error.message}` };
    }
  }
}