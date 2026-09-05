import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

interface ActiveOrder {
  id: number;
  invoiceNumber: string;
  subtotal: number;
  itemCount: number;
}

export interface TableWithActiveOrder {
  id: number;
  tableNumber: string;
  qrIdentifier: string;
  isOccupied: boolean;
  activeOrder: ActiveOrder | null;
}

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTables(): Promise<TableWithActiveOrder[]> {
    const tables = await this.prisma.cafeTable.findMany({
      orderBy: { id: 'asc' },
      include: {
        orders: {
          where: { status: OrderStatus.OPEN_BILL },
          include: {
            items: true,
          },
        },
      },
    });

    return tables.map((table) => {
      const order = table.orders[0] ?? null;

      const activeOrder: ActiveOrder | null = order
        ? {
            id: order.id,
            invoiceNumber: order.invoiceNumber,
            subtotal: Number(order.subtotal),
            itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
          }
        : null;

      return {
        id: table.id,
        tableNumber: table.tableNumber,
        qrIdentifier: table.qrIdentifier,
        isOccupied: table.isOccupied,
        activeOrder,
      };
    });
  }
}
