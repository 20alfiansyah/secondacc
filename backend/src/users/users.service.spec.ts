import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  const staffUser = {
    id: 3,
    username: 'kasir2',
    passwordHash: '$2a$10$existinghashexistinghashexistinghash',
    name: 'Budi Santoso',
    role: 'CASHIER',
    isActive: true,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('findAll — daftar staf tanpa passwordHash', () => {
    it('mengembalikan semua user dengan select tanpa passwordHash', async () => {
      const { passwordHash, ...safe } = staffUser;
      prisma.user.findMany.mockResolvedValue([safe]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('passwordHash');
      // Select wajib exclude passwordHash di level query.
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.objectContaining({ passwordHash: true }),
        }),
      );
    });
  });

  describe('create — hash password & tolak username duplikat', () => {
    const dto = {
      username: 'kasir2',
      name: 'Budi Santoso',
      password: 'rahasia123',
      role: 'CASHIER' as const,
    };

    it('meng-hash password (bukan plaintext) lalu membuat user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 3,
          username: data.username,
          name: data.name,
          role: data.role,
          isActive: true,
          createdAt: new Date(),
        }),
      );

      const result = await service.create(dto);

      expect(result).not.toHaveProperty('passwordHash');
      const call = prisma.user.create.mock.calls[0][0];
      expect(call.data.username).toBe('kasir2');
      expect(call.data.name).toBe('Budi Santoso');
      expect(call.data.role).toBe('CASHIER');
      // Hash bcrypt valid & cocok dengan password asli — bukan plaintext.
      expect(call.data.passwordHash).not.toBe(dto.password);
      await expect(
        bcrypt.compare(dto.password, call.data.passwordHash),
      ).resolves.toBe(true);
    });

    it('melempar ConflictException USERNAME_TAKEN saat username sudah dipakai', async () => {
      prisma.user.findUnique.mockResolvedValue(staffUser);

      await expect(service.create(dto)).rejects.toMatchObject({
        response: { code: 'USERNAME_TAKEN' },
      });
      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('updatePassword — re-hash password', () => {
    it('me-hash password baru lalu update user', async () => {
      prisma.user.findUnique.mockResolvedValue(staffUser);
      prisma.user.update.mockResolvedValue(staffUser);

      const result = await service.updatePassword(3, 'passwordBaru123');

      expect(result.id).toBe(3);
      const call = prisma.user.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 3 });
      expect(call.data.passwordHash).not.toBe('passwordBaru123');
      await expect(
        bcrypt.compare('passwordBaru123', call.data.passwordHash),
      ).resolves.toBe(true);
    });

    it('melempar NotFoundException dengan code USER_NOT_FOUND saat user tidak ada', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updatePassword(999, 'passwordBaru123')).rejects
        .toMatchObject({
          response: { code: 'USER_NOT_FOUND' },
        });
      await expect(
        service.updatePassword(999, 'passwordBaru123'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('toggleStatus — toggle & proteksi diri sendiri', () => {
    it('menonaktifkan user aktif (true ke false)', async () => {
      prisma.user.findUnique.mockResolvedValue(staffUser);
      prisma.user.update.mockResolvedValue({ ...staffUser, isActive: false });

      const result = await service.toggleStatus(3, 1);

      expect(result.isActive).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 3 },
          data: { isActive: false },
        }),
      );
    });

    it('mengaktifkan kembali user nonaktif (false ke true)', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...staffUser, isActive: false });
      prisma.user.update.mockResolvedValue({ ...staffUser, isActive: true });

      const result = await service.toggleStatus(3, 1);

      expect(result.isActive).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 3 },
          data: { isActive: true },
        }),
      );
    });

    it('melempar BadRequestException CANNOT_DISABLE_SELF saat admin menonaktifkan dirinya sendiri', async () => {
      prisma.user.findUnique.mockResolvedValue(staffUser);

      await expect(service.toggleStatus(3, 3)).rejects.toMatchObject({
        response: { code: 'CANNOT_DISABLE_SELF' },
      });
      await expect(service.toggleStatus(3, 3)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('tetap mengizinkan admin mengaktifkan kembali akunnya sendiri yang nonaktif', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...staffUser, isActive: false });
      prisma.user.update.mockResolvedValue({ ...staffUser, isActive: true });

      const result = await service.toggleStatus(3, 3);

      expect(result.isActive).toBe(true);
    });

    it('melempar NotFoundException dengan code USER_NOT_FOUND saat user tidak ada', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.toggleStatus(999, 1)).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND' },
      });
    });
  });
});
