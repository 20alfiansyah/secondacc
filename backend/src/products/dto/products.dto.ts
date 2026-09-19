import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO untuk POST /api/products dan PUT /api/products/:id (multipart/form-data).
 *
 * ValidationPipe global memakai `forbidNonWhitelisted: true` (docs/8 §2.4):
 * SEMUA field yang dikirim frontend wajib dideklarasikan di sini.
 * Field multipart datang sebagai string → angka dikonversi via @Type(() => Number);
 * boolean string "true"/"false" dikonversi manual di service (pola parseBool).
 * File `image` ditangani Multer (FileInterceptor) sebelum pipe — bukan bagian DTO.
 */
export class CreateProductDto {
  @IsString()
  name!: string;

  /** Integer Rupiah bulat (docs/8 §2.7.8) — multipart mengirim string. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  price!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  isRecommended?: string | boolean;

  @IsOptional()
  isBestSeller?: string | boolean;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  isRecommended?: string | boolean;

  @IsOptional()
  isBestSeller?: string | boolean;
}
