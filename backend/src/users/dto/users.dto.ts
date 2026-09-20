import { MinLength, IsEnum, IsString, Length } from 'class-validator';
import { Role } from '@prisma/client';

/** Body POST /api/users — role dibatasi enum Prisma (ADMIN | CASHIER). */
export class CreateUserDto {
  @IsString()
  @Length(1, 60)
  username!: string;

  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;

  @IsEnum(Role)
  role!: Role;
}

/** Body PATCH /api/users/:id/password. */
export class UpdatePasswordDto {
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword!: string;
}
