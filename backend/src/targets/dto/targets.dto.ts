import { IsNumber } from 'class-validator';

/**
 * DTO untuk PUT /api/targets. Body persis 3 field (ValidationPipe global
 * whitelist + forbidNonWhitelisted di main.ts: field asing -> 400).
 *
 * Cek TIPE di sini (class-validator); cek RENTANG (1-12, 2000-2100,
 * 0-1e12) sengaja di service — pola payment-channel.dto: error harus
 * membawa code kontrak (INVALID_MONTH/INVALID_YEAR/INVALID_TARGET_AMOUNT)
 * dari service, bukan 400 generic ValidationPipe.
 */
export class UpsertTargetDto {
  @IsNumber()
  month!: number;

  @IsNumber()
  year!: number;

  @IsNumber()
  targetAmount!: number;
}
