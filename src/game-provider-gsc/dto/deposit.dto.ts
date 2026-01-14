import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseApiRequestDto, BatchRequestItemDto, DataResponseItemDto } from './common.dto';

/**
 * Deposit API Request
 */
export class DepositRequestDto extends BaseApiRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchRequestItemDto)
  batch_requests: BatchRequestItemDto[];
}

/**
 * Deposit API Response Data
 */
export class DepositDataDto extends DataResponseItemDto {
  before_balance: number; // 操作前餘額 (元)
  balance: number; // 操作後餘額 (元)
}

/**
 * Deposit API Response
 */
export class DepositResponseDto {
  data: DepositDataDto[];
}
