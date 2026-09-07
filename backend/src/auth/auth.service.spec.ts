import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock };
  };
  let jwt: { sign: jest.Mock };

  const activeUser = {
    id: 2,
    username: 'siti',
    passwordHash: '$2a$10$fakehash',
    name: 'Siti',
    role: Role.CASHIER,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
    };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('harus terdefinisi', () => {
    expect(service).toBeDefined();
  });

  describe('login — skenario sukses', () => {
    it('mengembalikan token + user saat kredensial valid', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      // bcrypt compare: simulasi via mock spy di bawah pada service.
      jest
        .spyOn(service as any, 'verifyPassword')
        .mockResolvedValue(true);

      const result = await service.login('siti', 'kasir123');

      expect(result.token).toBe('signed.jwt.token');
      expect(result.user).toEqual({
        id: 2,
        username: 'siti',
        name: 'Siti',
        role: 'CASHIER',
      });
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 2,
          username: 'siti',
          role: 'CASHIER',
        }),
      );
    });

    it('melempar UnauthorizedException saat user tidak ditemukan', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login('nobody', 'x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('melempar UnauthorizedException (ACCOUNT_DISABLED) saat user tidak aktif', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, isActive: false });
      await expect(service.login('siti', 'kasir123')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'ACCOUNT_DISABLED' }),
      });
    });

    it('melempar UnauthorizedException (INVALID_CREDENTIALS) saat password salah', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      jest.spyOn(service as any, 'verifyPassword').mockResolvedValue(false);
      await expect(service.login('siti', 'salah')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'INVALID_CREDENTIALS' }),
      });
    });
  });
});
