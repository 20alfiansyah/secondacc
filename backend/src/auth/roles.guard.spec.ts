import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

// Mock Reflector + ExecutionContext — bentuk framework, bukan logika yang diuji.
const reflectorWith = (roles: Role[] | undefined) =>
  ({ getAllAndOverride: jest.fn().mockReturnValue(roles) }) as unknown as Reflector;

const contextWith = (user: { role: Role } | undefined) =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  it('meloloskan endpoint tanpa metadata @Roles (endpoint umum user ber-token)', () => {
    const guard = new RolesGuard(reflectorWith(undefined));

    expect(guard.canActivate(contextWith({ role: Role.CASHIER }))).toBe(true);
  });

  it('meloloskan role yang terdaftar', () => {
    const guard = new RolesGuard(reflectorWith([Role.ADMIN]));

    expect(guard.canActivate(contextWith({ role: Role.ADMIN }))).toBe(true);
  });

  it('menolak role lain dengan 403', () => {
    const guard = new RolesGuard(reflectorWith([Role.ADMIN]));

    expect(() => guard.canActivate(contextWith({ role: Role.CASHIER }))).toThrow(
      ForbiddenException,
    );
  });

  it('menolak request tanpa user dengan 403 FORBIDDEN (auth guard berjalan dulu)', () => {
    const guard = new RolesGuard(reflectorWith([Role.ADMIN]));

    expect(() => guard.canActivate(contextWith(undefined))).toThrow(ForbiddenException);
  });
});
