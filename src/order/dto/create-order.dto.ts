import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsEmail, IsPhoneNumber } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateOrderItemDto {
  @IsNumber()
  product_id: number

  @IsNumber()
  quantity: number

  @IsNumber()
  price: number

  @IsOptional()
  @IsString()
  product_name?: string

  @IsOptional()
  @IsString()
  product_sku?: string

  @IsOptional()
  selected_specs?: Record<string, string>
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[]

  @IsString()
  customer_name: string

  @IsString()
  customer_phone: string

  @IsEmail()
  customer_email: string

  @IsString()
  shipping_address: string

  @IsOptional()
  @IsString()
  shipping_method_id?: string

  @IsOptional()
  @IsString()
  shipping_method_name?: string

  @IsOptional()
  @IsNumber()
  shipping_fee?: number

  @IsString()
  payment_method: string

  @IsNumber()
  total_amount: number

  @IsOptional()
  @IsString()
  notes?: string

  @IsString()
  company: string
}