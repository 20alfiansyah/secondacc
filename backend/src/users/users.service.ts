import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/users.dto';

/** Field yang aman dikirim ke client — passwordHash TIDAK PERNAH ikut. */
const USER_SELECT = {
  id: true,
  username: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /api/users — daftar staf tanpa passwordHash. */
  findAll() {
    return this.prisma.user.findMany({ select: USER_SELECT, orderBy: { id: 'asc' } });
  }

  /** POST /api/users — hash password bcryptjs sebelum insert. */
  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException({
        code: 'USERNAME_TAKEN',
        message: `Username "${dto.username}" is already taken`,
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    return this.prisma.user.create({
      data: {
        username: dto.username,
        name: dto.name,
        passwordHash,
        role: dto.role,
      },
      select: USER_SELECT,
    });
  }

  /** PATCH /api/users/:id/password — re-hash password baru. */
  async updatePassword(id: number, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: `User with id ${id} not found`,
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: USER_SELECT,
    });
  }

  /** PATCH /api/users/:id/toggle-status — tolak bila admin menonaktifkan dirinya sendiri. */
  async toggleStatus(id: number, requesterId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: `User with id ${id} not found`,
      });
    }
    if (id === requesterId && user.isActive) {
      throw new BadRequestException({
        code: 'CANNOT_DISABLE_SELF',
        message: 'You cannot deactivate your own account',
      });
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: USER_SELECT,
    });
  }
}
