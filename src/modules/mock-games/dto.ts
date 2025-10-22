export type Currency = 'TWD' | 'USD';

export interface SessionRequestDto {
  playerId: string;
  currency?: Currency;
}

export interface SessionResponseDto {
  sessionToken: string;
  playerId: string;
  currency: Currency;
  expiredAt: string;
}

export interface BalanceResponseDto {
  playerId: string;
  balance: number;
  currency: Currency;
}

export interface PlaceBetDto {
  sessionToken: string;
  gameId: 'HI_LO' | 'DICE';
  roundId: string;
  betAmount: number;
  betPayload: any;
}

export interface BetResultDto {
  status: 'ACCEPTED' | 'REJECTED';
  reason?: string;
  roundId: string;
  txnId: string;
  balanceAfter?: number;
}

export interface SettleResponseDto {
  roundId: string;
  result: any;
  winAmount: number;
  balanceAfter: number;
  finished: boolean;
}

export interface GameItem {
  gameId: string;
  gameName: string;
  category: string;
  status: 'ONLINE' | 'OFFLINE';
}

export interface GamesResponseDto {
  items: GameItem[];
}