import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from './jwt-auth.guard';
import { ROLES_KEY } from './roles.decorator';

/**
 * Dipasang setelah JwtAuthGuard (@UseGuards(JwtAuthGuard, RolesGuard)):
 * menolak request bila role user tidak ada di daftar @Roles().
 * Tanpa metadata @Roles() endpoint tetap terbuka untuk semua user ber-token.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      // Guard auth harus jalan lebih dulu; tanpa user berarti salah urutan guard.
      throw new UnauthorizedException('Missing authenticated user');
    }
    if (!required.includes(user.role)) {
      throw new ForbiddenException('Role tidak memiliki akses ke endpoint ini');
    }
    return true;
  }
}
