import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentChannelDto } from './dto/payment-channel.dto';

export interface PaymentChannelFilter {
  isActive?: string;
}

/** Helper parse query string boolean ("true"/"false") ke boolean. */
function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value === 'true';
}

@Injectable()
export class PaymentChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: PaymentChannelFilter) {
    const where: Record<string, unknown> = {};

    if (filter.isActive !== undefined) {
      where.isActive = parseBool(filter.isActive);
    }

    return this.prisma.paymentChannel.findMany({
      where,
      orderBy: { id: 'asc' },
    });
  }

  async create(dto: CreatePaymentChannelDto) {
    if (!Object.values(PaymentCategory).includes(dto.category as PaymentCategory)) {
      throw new BadRequestException({
        code: 'INVALID_CATEGORY',
        message: `Invalid channel category: ${dto.category}. Use CASH, THIRD_PARTY, or EDC`,
      });
    }

    return this.prisma.paymentChannel.create({
      data: { name: dto.name, category: dto.category as PaymentCategory },
    });
  }

  async toggle(id: number) {
    const channel = await this.prisma.paymentChannel.findUnique({ where: { id } });
    if (!channel) {
      throw new NotFoundException({
        code: 'CHANNEL_NOT_FOUND',
        message: `Payment channel with id ${id} not found`,
      });
    }

    return this.prisma.paymentChannel.update({
      where: { id },
      data: { isActive: !channel.isActive },
    });
  }
}
