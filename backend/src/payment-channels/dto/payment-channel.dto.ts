import { IsString, Length } from 'class-validator';

/**
 * Body POST /api/payment-channels — dipakai ValidationPipe global
 * (whitelist + forbidNonWhitelisted) supaya payload liar jadi 400, bukan 500.
 */
export class CreatePaymentChannelDto {
  @IsString()
  @Length(1, 60)
  name!: string;

  /**
   * Kategori CASH | THIRD_PARTY | EDC. Sengaja string (bukan @IsEnum):
   * kontrak §6.5 meminta error 400 INVALID_CATEGORY dengan body berkode
   * dari service — bukan 400 generic dari ValidationPipe.
   */
  @IsString()
  @Length(1, 30)
  category!: string;
}
