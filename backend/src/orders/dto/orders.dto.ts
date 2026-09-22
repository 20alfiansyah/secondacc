import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType, PaymentCategory } from '@prisma/client';

/**
 * DTO endpoint /api/orders — dipakai ValidationPipe global (whitelist +
 * forbidNonWhitelisted) supaya payload liar jadi 400, bukan 500.
 * Kelas ini juga tipe input langsung OrdersService.
 */
export class OpenBillItemDto {
  /** Produk wajib ada di DB (divalidasi ulang di service). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class OpenBillDto {
  @IsEnum(OrderType)
  orderType!: OrderType;

  @IsString()
  @Length(1, 60)
  customerName!: string;

  @IsOptional()
  @IsIn(['L', 'P'])
  customerGender?: 'L' | 'P';

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OpenBillItemDto)
  items!: OpenBillItemDto[];
}

/** Body PUT /orders/:id/items — full replace items order OPEN_BILL. */
export class UpdateOpenBillItemsDto {
  @IsOptional()
  @IsString()
  @Length(1, 60)
  customerName?: string;

  @IsOptional()
  @IsIn(['L', 'P'])
  customerGender?: 'L' | 'P';

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OpenBillItemDto)
  items!: OpenBillItemDto[];
}

/** Body POST /orders/:id/checkout. */
export class CheckoutDto {
  @IsOptional()
  @IsIn(['L', 'P'])
  customerGender?: 'L' | 'P';

  @IsEnum(PaymentCategory)
  paymentCategory!: PaymentCategory;

  @IsString()
  @Length(1, 50)
  methodName!: string;

  /** Rupiah bulat >= 1 (guardrail integer money). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaid!: number;
}
