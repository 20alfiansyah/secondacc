import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Batasi endpoint ke role tertentu; tanpa decorator = semua user ber-token. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
