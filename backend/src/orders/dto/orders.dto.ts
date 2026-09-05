import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CustomerGender, PaymentCategory } from '@prisma/client';

export class OpenBillItemDto {
  @IsInt()
  @IsPositive()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class OpenBillDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsInt()
  @IsPositive()
  tableId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OpenBillItemDto)
  items: OpenBillItemDto[];
}

export class PaymentDto {
  @IsEnum(PaymentCategory)
  category: PaymentCategory;

  @IsString()
  methodName: string;

  @IsInt()
  @Min(0)
  amountPaid: number;
}

export class CheckoutDto {
  @IsEnum(CustomerGender)
  customerGender: CustomerGender;

  @ValidateNested()
  @Type(() => PaymentDto)
  payment: PaymentDto;
}
