import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseApiRequestDto, BatchRequestItemDto, DataResponseItemDto } from './common.dto';

/**
 * Balance API Request
 */
export class BalanceRequestDto extends BaseApiRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchRequestItemDto)
  batch_requests: BatchRequestItemDto[];
}

/**
 * Balance API Response Data
 */
export class BalanceDataDto extends DataResponseItemDto {
  balance: number; // 餘額 (元)
}

/**
 * Balance API Response
 */
export class BalanceResponseDto {
  data: BalanceDataDto[];
}
