import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BetTxnEntity } from './entities/bet-txn.entity';
import { RoundResultEntity } from './entities/round-result.entity';

export interface BetTxnData {
  playerId: string;
  roundId: string;
  gameId: 'HI_LO' | 'DICE';
  betAmount: number;
  betPayload: any;
  clientTxnId?: string;
  sessionToken: string;
  txnId: string;
  processingTimeMs?: number;
}

export interface RoundResultData {
  playerId: string;
  roundId: string;
  gameId: 'HI_LO' | 'DICE';
  result: any;
  winAmount: number;
  balanceAfter: number;
  betAmount?: number;
  processingTimeMs?: number;
}

export interface BetHistoryQuery {
  playerId?: string | null;
  limit?: number;
  offset?: number;
  gameId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface RoundHistoryQuery {
  playerId?: string | null;
  limit?: number;
  offset?: number;
  gameId?: string;
  finished?: boolean;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class MockGamesRepository {
  constructor(
    @InjectRepository(BetTxnEntity)
    private readonly betTxnRepo: Repository<BetTxnEntity>,
    @InjectRepository(RoundResultEntity)
    private readonly roundResultRepo: Repository<RoundResultEntity>,
  ) {}

  async saveBetTxn(data: BetTxnData): Promise<BetTxnEntity> {
    const entity = this.betTxnRepo.create({
      playerId: data.playerId,
      roundId: data.roundId,
      gameId: data.gameId,
      betAmount: data.betAmount,
      betPayload: data.betPayload,
      clientTxnId: data.clientTxnId,
      sessionToken: data.sessionToken,
      txnId: data.txnId,
      processingTimeMs: data.processingTimeMs,
      status: 'ACCEPTED',
    });

    return await this.betTxnRepo.save(entity);
  }

  async saveRoundResult(data: RoundResultData): Promise<RoundResultEntity> {
    // 計算結果類型
    let outcome = 'LOSE';
    if (data.winAmount > 0) {
      outcome = data.betAmount && data.winAmount > data.betAmount ? 'WIN' : 'DRAW';
    }

    const entity = this.roundResultRepo.create({
      playerId: data.playerId,
      roundId: data.roundId,
      gameId: data.gameId,
      result: data.result,
      winAmount: data.winAmount,
      balanceAfter: data.balanceAfter,
      betAmount: data.betAmount,
      processingTimeMs: data.processingTimeMs,
      finished: true,
      outcome,
    });

    return await this.roundResultRepo.save(entity);
  }

  async getBetHistory(query: BetHistoryQuery): Promise<{
    items: BetTxnEntity[];
    total: number;
  }> {
    const queryBuilder = this.betTxnRepo
      .createQueryBuilder('bet');

    if (query.playerId) {
      queryBuilder.andWhere('bet.playerId = :playerId', { playerId: query.playerId });
    }

    if (query.gameId) {
      queryBuilder.andWhere('bet.gameId = :gameId', { gameId: query.gameId });
    }

    if (query.status) {
      queryBuilder.andWhere('bet.status = :status', { status: query.status.toUpperCase() });
    }

    if (query.startDate) {
      queryBuilder.andWhere('bet.createdAt >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      queryBuilder.andWhere('bet.createdAt <= :endDate', { endDate: query.endDate });
    }

    queryBuilder.orderBy('bet.createdAt', 'DESC');

    if (query.limit) {
      queryBuilder.limit(query.limit);
    }

    if (query.offset) {
      queryBuilder.offset(query.offset);
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total };
  }

  async getRoundHistory(query: RoundHistoryQuery): Promise<{
    items: RoundResultEntity[];
    total: number;
  }> {
    const queryBuilder = this.roundResultRepo
      .createQueryBuilder('round');

    if (query.playerId) {
      queryBuilder.andWhere('round.playerId = :playerId', { playerId: query.playerId });
    }

    if (query.gameId) {
      queryBuilder.andWhere('round.gameId = :gameId', { gameId: query.gameId });
    }

    if (query.finished !== undefined) {
      queryBuilder.andWhere('round.finished = :finished', { finished: query.finished });
    }

    if (query.startDate) {
      queryBuilder.andWhere('round.settledAt >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      queryBuilder.andWhere('round.settledAt <= :endDate', { endDate: query.endDate });
    }

    queryBuilder.orderBy('round.settledAt', 'DESC');

    if (query.limit) {
      queryBuilder.limit(query.limit);
    }

    if (query.offset) {
      queryBuilder.offset(query.offset);
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total };
  }

  async getPlayerStats(playerId: string, gameId?: string): Promise<{
    totalBets: number;
    totalBetAmount: number;
    totalWinAmount: number;
    totalRounds: number;
    winRate: number;
  }> {
    let betQuery = this.betTxnRepo
      .createQueryBuilder('bet')
      .where('bet.playerId = :playerId', { playerId });

    let roundQuery = this.roundResultRepo
      .createQueryBuilder('round')
      .where('round.playerId = :playerId', { playerId });

    if (gameId) {
      betQuery = betQuery.andWhere('bet.gameId = :gameId', { gameId });
      roundQuery = roundQuery.andWhere('round.gameId = :gameId', { gameId });
    }

    const [betStats, roundStats] = await Promise.all([
      betQuery
        .select('COUNT(*)', 'count')
        .addSelect('SUM(bet.betAmount)', 'totalAmount')
        .getRawOne(),
      roundQuery
        .select('COUNT(*)', 'count')
        .addSelect('SUM(round.winAmount)', 'totalWin')
        .addSelect('COUNT(CASE WHEN round.outcome = \'WIN\' THEN 1 END)', 'wins')
        .getRawOne(),
    ]);

    const totalBets = parseInt(betStats.count) || 0;
    const totalBetAmount = parseFloat(betStats.totalAmount) || 0;
    const totalRounds = parseInt(roundStats.count) || 0;
    const totalWinAmount = parseFloat(roundStats.totalWin) || 0;
    const wins = parseInt(roundStats.wins) || 0;
    const winRate = totalRounds > 0 ? (wins / totalRounds) * 100 : 0;

    return {
      totalBets,
      totalBetAmount,
      totalWinAmount,
      totalRounds,
      winRate,
    };
  }

  async findDuplicateBet(clientTxnId: string): Promise<BetTxnEntity | null> {
    if (!clientTxnId) return null;
    
    return await this.betTxnRepo.findOne({
      where: { clientTxnId },
      order: { createdAt: 'DESC' },
    });
  }

  async findRoundResult(roundId: string): Promise<RoundResultEntity | null> {
    return await this.roundResultRepo.findOne({
      where: { roundId },
    });
  }

  // 清理指定玩家的所有資料庫記錄
  async clearPlayerData(playerId: string): Promise<void> {
    try {
      // 刪除該玩家的所有下注記錄
      await this.betTxnRepo.delete({ playerId });
      
      // 刪除該玩家的所有回合結果記錄
      await this.roundResultRepo.delete({ playerId });
      
      console.log(`[MOCK-GAMES:DB] Cleared all data for player: ${playerId}`);
    } catch (error) {
      console.error(`[MOCK-GAMES:DB] Failed to clear player data for ${playerId}:`, error.message);
      throw error;
    }
  }
}