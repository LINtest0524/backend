import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

/**
 * 交易資訊 (Transaction)
 */
export class TransactionDto {
  @IsString()
  id: string; // 交易 ID

  @IsString()
  action: string; // BET, SETTLED, ROLLBACK, etc.

  @IsString()
  wager_code: string; // 注單號

  @IsString()
  wager_status: string; // BET, SETTLED, VOID

  @IsString()
  @IsOptional()
  round_id?: string; // 遊戲局號

  @IsString()
  @IsOptional()
  channel_code?: string; // gscp

  @IsNumber()
  amount: number; // 金額 (元)

  @IsNumber()
  bet_amount: number; // 下注金額 (元)

  @IsNumber()
  valid_bet_amount: number; // 有效投注 (元)

  @IsNumber()
  prize_amount: number; // 中獎金額 (元)

  @IsNumber()
  tip_amount: number; // 小費 (元)

  @IsNumber()
  settled_at: number; // 結算時間戳 (毫秒)

  @IsString()
  game_code: string; // 遊戲代碼

  @IsString()
  @IsOptional()
  wager_type?: string; // NORMAL, FREEROUND

  @IsOptional()
  payload?: any; // 額外資訊
}

/**
 * Batch Request 項目
 */
export class BatchRequestItemDto {
  @IsString()
  member_account: string; // 玩家帳號

  @IsNumber()
  product_code: number; // 產品代碼

  @IsString()
  @IsOptional()
  game_type?: string; // 遊戲類型

  @IsArray()
  @IsOptional()
  transactions?: TransactionDto[]; // 交易列表
}

/**
 * 基礎 API 請求
 */
export class BaseApiRequestDto {
  @IsString()
  operator_code: string; // 運營商代碼

  @IsString()
  @IsOptional()
  currency?: string; // 貨幣

  @IsString()
  sign: string; // 簽名

  @IsString()
  request_time: string; // 請求時間戳 (秒)
}

/**
 * 基礎 API 回應
 */
export class BaseApiResponseDto {
  code: number; // 錯誤碼
  message: string; // 訊息
}

/**
 * Data 回應項目基礎類別
 */
export class DataResponseItemDto {
  member_account: string; // 玩家帳號
  product_code: number; // 產品代碼
  code: number; // 錯誤碼
  message: string; // 訊息
}
