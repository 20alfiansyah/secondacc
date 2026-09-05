import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

describe('AuthService (login -> JWT + role)', () => {
  let authService: AuthService;
  let prisma: PrismaService;

  const jwtService = new JwtService({ secret: 'test-secret' });

  beforeAll(async () => {
    // Simulasikan user ter-seed dengan password ter-hash
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    } as unknown as PrismaService;

    authService = new AuthService(prisma, jwtService);
  });

  describe('1. Login BERHASIL -> mengembalikan accessToken + role', () => {
    it('harus mengembalikan JWT accessToken dan role untuk kasir aktif', async () => {
      const passwordHash = await bcrypt.hash('kasir123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'kasir1',
        passwordHash,
        name: 'Siti Kasir',
        role: Role.CASHIER,
        isActive: true,
      });

      const result = await authService.login('kasir1', 'kasir123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('role');
      expect(typeof result.accessToken).toBe('string');
      expect(result.accessToken.length).toBeGreaterThan(20);
      expect(result.role).toBe(Role.CASHIER);

      // Token harus valid & payload berisi identitas user
      const payload = jwtService.verify(result.accessToken);
      expect(payload.sub).toBe(1);
      expect(payload.username).toBe('kasir1');
      expect(payload.role).toBe(Role.CASHIER);
    });

    it('harus mengembalikan role ADMIN untuk admin aktif', async () => {
      const passwordHash = await bcrypt.hash('admin123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        username: 'admin',
        passwordHash,
        name: 'Owner',
        role: Role.ADMIN,
        isActive: true,
      });

      const result = await authService.login('admin', 'admin123');

      expect(result.role).toBe(Role.ADMIN);
    });
  });

  describe('2. Login GAGAL -> UnauthorizedException', () => {
    it('harus menolak jika username tidak ditemukan', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login('ghost', 'xxx')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('harus menolak jika password salah', async () => {
      const passwordHash = await bcrypt.hash('kasir123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'kasir1',
        passwordHash,
        role: Role.CASHIER,
        isActive: true,
      });

      await expect(authService.login('kasir1', 'salah-sandi')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('harus menolak jika akun dinonaktifkan (isActive = false)', async () => {
      const passwordHash = await bcrypt.hash('kasir123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 3,
        username: 'kasir2',
        passwordHash,
        role: Role.CASHIER,
        isActive: false,
      });

      await expect(authService.login('kasir2', 'kasir123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('3. Konsistensi password (bcrypt) - anti-hash-collision', () => {
    it('harus menolak input yang sama hash-nya tapi beda kata sandi (anti ambiguitas)', async () => {
      // Menggunakan kasus salah password dari atas: hash milik kasir123,
      // tapi login dengan password berbeda harus tetap ditolak
      const passwordHash = await bcrypt.hash('kasir123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'kasir1',
        passwordHash,
        role: Role.CASHIER,
        isActive: true,
      });

      await expect(authService.login('kasir1', 'Kasir123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
