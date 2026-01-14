import { IsString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseApiRequestDto } from './common.dto';

/**
 * Wager for Push Bet Data
 */
export class WagerDto {
  @IsString()
  member_account: string;

  @IsNumber()
  bet_amount: number; // 元

  @IsNumber()
  valid_bet_amount: number; // 元

  @IsNumber()
  prize_amount: number; // 元

  @IsNumber()
  tip_amount: number; // 元

  @IsString()
  wager_type: string; // NORMAL, FREEROUND

  @IsString()
  wager_code: string; // 注單號

  @IsString()
  wager_status: string; // BET, SETTLED, VOID

  @IsString()
  round_id: string; // 遊戲局號

  @IsString()
  channel_code: string; // gscp

  @IsString()
  game_type: string; // SLOT, LIVE_CASINO, etc.

  @IsNumber()
  settled_at: number; // 結算時間戳 (毫秒)

  @IsNumber()
  created_at: number; // 建立時間戳 (毫秒)

  payload?: any; // 額外資料

  @IsString()
  product_code: string; // 產品代碼

  @IsString()
  game_code: string; // 遊戲代碼

  @IsString()
  currency: string; // 貨幣
}

/**
 * Push Bet Data API Request
 */
export class PushBetDataRequestDto extends BaseApiRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WagerDto)
  wagers: WagerDto[];
}

/**
 * Push Bet Data API Response
 */
export class PushBetDataResponseDto {
  code: number;
  message: string;
}
