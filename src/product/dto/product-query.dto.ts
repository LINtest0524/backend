import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { ProductStatus } from '../product.entity';

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // 搜尋關鍵字

  @IsOptional()
  @IsNumber()
  category_id?: number; // 分類篩選

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus; // 狀態篩選

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean; // 是否精選

  @IsOptional()
  @IsNumber()
  min_price?: number; // 最低價格

  @IsOptional()
  @IsNumber()
  max_price?: number; // 最高價格

  @IsOptional()
  @IsString()
  sort_by?: string; // 排序欄位 (price, created_at, name, etc.)

  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC'; // 排序方向

  @IsOptional()
  @IsNumber()
  page?: number; // 頁碼

  @IsOptional()
  @IsNumber()
  limit?: number; // 每頁數量

  @IsOptional()
  @IsString()
  tags?: string; // 標籤篩選 (逗號分隔)
}