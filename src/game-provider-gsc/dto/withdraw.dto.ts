import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseApiRequestDto, BatchRequestItemDto, DataResponseItemDto } from './common.dto';

/**
 * Withdraw API Request
 */
export class WithdrawRequestDto extends BaseApiRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchRequestItemDto)
  batch_requests: BatchRequestItemDto[];

  @IsString()
  game_type?: string; // 遊戲類型 (optional)
}

/**
 * Withdraw API Response Data
 */
export class WithdrawDataDto extends DataResponseItemDto {
  before_balance: number; // 操作前餘額 (元)
  balance: number; // 操作後餘額 (元)
}

/**
 * Withdraw API Response
 */
export class WithdrawResponseDto {
  data: WithdrawDataDto[];
}
