import { Test, TestingModule } from '@nestjs/testing';
import { TablesService } from './tables.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

interface ActiveOrderRow {
  id: number;
  invoiceNumber: string;
  subtotal: bigint;
  grandTotal: bigint;
  status: OrderStatus;
  items: { quantity: number }[];
}

function tableRow(
  overrides: Partial<{
    id: number;
    tableNumber: string;
    qrIdentifier: string;
    isOccupied: boolean;
    orders: ActiveOrderRow[];
  }> = {},
) {
  return {
    id: 1,
    tableNumber: 'Meja 01',
    qrIdentifier: 'tb-01-uuid',
    isOccupied: true,
    updatedAt: new Date(),
    orders: [] as ActiveOrderRow[],
    ...overrides,
  };
}

describe('TablesService (#getTables -> status terisi + info open bill)', () => {
  let service: TablesService;
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = {
      cafeTable: {
        findMany: jest.fn(),
      },
    } as unknown as PrismaService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TablesService>(TablesService);
  });

  it('meja terisi menampilkan activeOrder (id, invoiceNumber, subtotal, itemCount)', async () => {
    const activeOrder = {
      id: 45,
      invoiceNumber: 'INV-20260905-0045',
      subtotal: BigInt(65000),
      grandTotal: BigInt(65000),
      status: OrderStatus.OPEN_BILL,
      items: [
        { quantity: 2 },
        { quantity: 1 },
      ],
    };

    (prisma.cafeTable.findMany as jest.Mock).mockResolvedValue([
      tableRow({ isOccupied: true, orders: [activeOrder] }),
    ]);

    const result = await service.getTables();

    expect(result).toHaveLength(1);
    expect(result[0].isOccupied).toBe(true);
    expect(result[0].activeOrder).toEqual({
      id: 45,
      invoiceNumber: 'INV-20260905-0045',
      subtotal: 65000,
      itemCount: 3,
    });
  });

  it('hanya order OPEN_BILL yang dianggap activeOrder (order PAID diabaikan)', async () => {
    // Prisma sudah memfilter orders ke status OPEN_BILL (di-test terpisah),
    // sehingga meja dengan isOccupied=false selalu punya orders kosong -> activeOrder null.
    (prisma.cafeTable.findMany as jest.Mock).mockResolvedValue([
      tableRow({ isOccupied: false, orders: [] }),
      tableRow({ id: 2, isOccupied: false, orders: [] }),
    ]);

    const result = await service.getTables();

    expect(result).toHaveLength(2);
    expect(result[1].activeOrder).toBeNull();
  });

  it('meja kosong menampilkan activeOrder = null', async () => {
    (prisma.cafeTable.findMany as jest.Mock).mockResolvedValue([
      tableRow({ isOccupied: false, orders: [] }),
    ]);

    const result = await service.getTables();

    expect(result[0].activeOrder).toBeNull();
    expect(result[0].isOccupied).toBe(false);
  });

  it('query include membawa orders beserta items', async () => {
    (prisma.cafeTable.findMany as jest.Mock).mockResolvedValue([]);

    await service.getTables();

    const call = (prisma.cafeTable.findMany as jest.Mock).mock.calls[0][0];
    expect(call.include.orders.include.items).toBeDefined();
    expect(call.include.orders.where.status).toBe(OrderStatus.OPEN_BILL);
  });
});
