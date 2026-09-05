import { PrismaClient, Role, PaymentCategory } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding database Kafe POS...');

  // 1. SEED USERS (Admin & Kasir)
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const cashierPassword = await bcrypt.hash('kasir123', salt);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      name: 'Owner / Manager Kafe',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { username: 'kasir1' },
    update: {},
    create: {
      username: 'kasir1',
      passwordHash: cashierPassword,
      name: 'Siti Kasir',
      role: Role.CASHIER,
      isActive: true,
    },
  });

  console.log(`✅ Users seeded: ${admin.username} (Admin), ${cashier.username} (Cashier)`);

  // 2. SEED CATEGORIES
  const categoriesData = [
    { name: 'Kopi', slug: 'kopi' },
    { name: 'Non-Kopi', slug: 'non-kopi' },
    { name: 'Makanan Berat', slug: 'makanan-berat' },
    { name: 'Snack & Pastry', slug: 'snack-pastry' },
  ];

  const categories: Record<string, any> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categories[cat.slug] = created;
  }
  console.log(`✅ ${categoriesData.length} Kategori berhasil di-seed`);

  // 3. SEED PRODUCTS (15 Menu Kafe)
  const productsData = [
    // Kopi
    { name: 'Espresso Single', price: BigInt(18000), slug: 'kopi', description: 'Ekstraksi kopi murni 30ml', isAvailable: true },
    { name: 'Americano (Hot/Ice)', price: BigInt(22000), slug: 'kopi', description: 'Espresso dengan air mineral segar', isAvailable: true },
    { name: 'Kopi Susu Gula Aren', price: BigInt(25000), slug: 'kopi', description: 'Signature espresso, fresh milk, & gula aren murni', isAvailable: true },
    { name: 'Cafe Latte', price: BigInt(28000), slug: 'kopi', description: 'Espresso dengan steamed milk lembut', isAvailable: true },
    { name: 'Cappuccino', price: BigInt(28000), slug: 'kopi', description: 'Espresso dengan foam susu tebal & taburan cokelat', isAvailable: true },

    // Non-Kopi
    { name: 'Matcha Green Tea Latte', price: BigInt(30000), slug: 'non-kopi', description: 'Matcha Uji autentik dengan susu segar', isAvailable: true },
    { name: 'Chocolate Signature', price: BigInt(28000), slug: 'non-kopi', description: 'Cokelat Belgia pekat manis pas', isAvailable: true },
    { name: 'Lemon Tea (Fresh Brew)', price: BigInt(20000), slug: 'non-kopi', description: 'Teh hitam segar dengan perasan lemon asli', isAvailable: true },

    // Makanan Berat
    { name: 'Nasi Goreng Spesial Kafe', price: BigInt(35000), slug: 'makanan-berat', description: 'Nasi goreng dengan ayam suwir, telur mata sapi, & kerupuk', isAvailable: true },
    { name: 'Mie Goreng Seafood', price: BigInt(32000), slug: 'makanan-berat', description: 'Mie telur dengan udang & cumi segar', isAvailable: true },
    { name: 'Chicken Katsu Rice Bowl', price: BigInt(38000), slug: 'makanan-berat', description: 'Ayam katsu krispi dengan saus teriyaki & telur', isAvailable: true },
    { name: 'Spaghetti Carbonara', price: BigInt(42000), slug: 'makanan-berat', description: 'Pasta creamy dengan smoked beef & parmesan', isAvailable: true },

    // Snack & Pastry
    { name: 'French Fries (Kentang Goreng)', price: BigInt(22000), slug: 'snack-pastry', description: 'Kentang goreng gurih renyah dengan saus cocolan', isAvailable: true },
    { name: 'Butter Croissant', price: BigInt(25000), slug: 'snack-pastry', description: 'Pastry Prancis renyah berlapis mentega', isAvailable: false }, // Sample SOLD OUT
    { name: 'Roti Bakar Cokelat Keju', price: BigInt(26000), slug: 'snack-pastry', description: 'Roti tebal dengan limpahan cokelat meses & parutan keju', isAvailable: true },
  ];

  for (const prod of productsData) {
    const existing = await prisma.product.findFirst({ where: { name: prod.name } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: prod.name,
          price: prod.price,
          description: prod.description,
          categoryId: categories[prod.slug].id,
          isAvailable: prod.isAvailable,
        },
      });
    }
  }
  console.log(`✅ ${productsData.length} Menu kafe berhasil di-seed (Termasuk sample Sold Out)`);

  // 4. SEED TABLES (10 Meja Kafe)
  for (let i = 1; i <= 10; i++) {
    const tableNum = `Meja ${i.toString().padStart(2, '0')}`;
    await prisma.cafeTable.upsert({
      where: { tableNumber: tableNum },
      update: {},
      create: {
        tableNumber: tableNum,
        qrIdentifier: `tb-${i}-qr-code`,
        isOccupied: false,
      },
    });
  }
  console.log('✅ 10 Meja kafe berhasil di-seed (Meja 01 s/d Meja 10)');

  // 5. SEED PAYMENT CHANNELS
  const channels = [
    { name: 'Tunai Laci (Cash)', category: PaymentCategory.CASH },
    { name: 'Midtrans Dynamic QRIS', category: PaymentCategory.THIRD_PARTY },
    { name: 'EDC Debit / Kredit BCA', category: PaymentCategory.EDC },
  ];

  for (const ch of channels) {
    const existing = await prisma.paymentChannel.findFirst({ where: { name: ch.name } });
    if (!existing) {
      await prisma.paymentChannel.create({
        data: ch,
      });
    }
  }
  console.log('✅ 3 Channel pembayaran berhasil di-seed (Cash, Midtrans QRIS, EDC)');

  // 6. SEED MONTHLY TARGET (Bulan September 2026)
  await prisma.monthlyTarget.upsert({
    where: {
      month_year: {
        month: 9,
        year: 2026,
      },
    },
    update: {},
    create: {
      month: 9,
      year: 2026,
      targetAmount: BigInt(50000000), // Rp 50.000.000
    },
  });
  console.log('✅ Target omset September 2026 di-seed: Rp 50.000.000');

  console.log('🎉 Seeding database selesai 100%!');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
