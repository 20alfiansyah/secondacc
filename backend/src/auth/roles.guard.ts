import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';

/**
 * Dekorator `@Roles('ADMIN', 'CASHIER')` — menandai role yang diizinkan
 * mengakses sebuah route/controller.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Guard otorisasi berbasis role. Harus dijalankan SETELAH JwtAuthGuard
 * (yang mengisi `request.user.role`). Menolak akses jika role user tidak
 * termasuk dalam metadata `@Roles`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string } | undefined;
    if (!user || !requiredRoles.includes(user.role!)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have access to this resource',
      });
    }
    return true;
  }
}
