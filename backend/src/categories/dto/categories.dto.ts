import { IsString, Length } from 'class-validator';

/**
 * DTO untuk POST /api/categories dan PATCH /api/categories/:id.
 *
 * ValidationPipe global memakai whitelist + forbidNonWhitelisted (main.ts):
 * field di luar DTO -> 400. Trim dilakukan di service (bukan @Transform)
 * supaya logika normalisasi terpusat satu tempat.
 */
export class CreateCategoryDto {
  @IsString()
  @Length(1, 50)
  name!: string;
}

export class UpdateCategoryDto {
  @IsString()
  @Length(1, 50)
  name!: string;
}
