import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ProductStatus } from '../product.entity';

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // 搜尋關鍵字

  @IsOptional()
  @IsString()
  name?: string; // 商品名稱

  @IsOptional()
  @IsString()
  sku?: string; // 商品 SKU

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  category_id?: number; // 分類篩選

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus; // 狀態篩選

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_featured?: boolean; // 是否精選

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_visible?: boolean; // 是否顯示

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  min_price?: number; // 最低價格

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  max_price?: number; // 最高價格

  @IsOptional()
  @IsString()
  createdFrom?: string; // 建立時間起始

  @IsOptional()
  @IsString()
  createdTo?: string; // 建立時間結束

  @IsOptional()
  @IsString()
  sort_by?: string; // 排序欄位 (price, created_at, name, etc.)

  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC'; // 排序方向

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number; // 頁碼

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number; // 每頁數量

  @IsOptional()
  @IsString()
  tags?: string; // 標籤篩選 (逗號分隔)
}