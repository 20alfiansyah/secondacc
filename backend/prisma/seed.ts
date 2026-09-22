import { Logger } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const logger = new Logger('Seed');

async function main() {
  logger.log('🌱 Memulai proses seeding database Kafe POS...');

  // 1. SEED USERS (Admin & Kasir) — kredensial dari environment, TIDAK ada
  //    password default hardcode. Username boleh di-override, password wajib.
  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const cashierUsername = process.env.SEED_CASHIER_USERNAME ?? 'kasir1';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const cashierPassword = process.env.SEED_CASHIER_PASSWORD;

  if (!adminPassword || !cashierPassword) {
    throw new Error(
      'Seed butuh SEED_ADMIN_PASSWORD dan SEED_CASHIER_PASSWORD di environment (lihat .env.example).',
    );
  }

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash(adminPassword, salt);
  const cashierPasswordHash = await bcrypt.hash(cashierPassword, salt);

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      passwordHash: adminPasswordHash,
      name: 'Owner / Manager Kafe',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { username: cashierUsername },
    update: {},
    create: {
      username: cashierUsername,
      passwordHash: cashierPasswordHash,
      name: 'Siti Kasir',
      role: Role.CASHIER,
      isActive: true,
    },
  });

  logger.log(`✅ Users seeded: ${admin.username} (Admin), ${cashier.username} (Cashier)`);

  // 2. SEED CATEGORIES
  const categoriesData = [
    { name: 'Kopi', slug: 'kopi' },
    { name: 'Non-Kopi', slug: 'non-kopi' },
    { name: 'Makanan Berat', slug: 'makanan-berat' },
    { name: 'Snack & Pastry', slug: 'snack-pastry' },
  ];

  const categories: Record<string, { id: number }> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categories[cat.slug] = created;
  }
  logger.log(`✅ ${categoriesData.length} Kategori berhasil di-seed`);

  // 3. SEED PRODUCTS (15 Menu Kafe)
  const productsData = [
    // Kopi
    { name: 'Espresso Single', price: 18000, slug: 'kopi', description: 'Ekstraksi kopi murni 30ml', isAvailable: true, isRecommended: false, isBestSeller: false },
    { name: 'Americano (Hot/Ice)', price: 22000, slug: 'kopi', description: 'Espresso dengan air mineral segar', isAvailable: true, isRecommended: false, isBestSeller: true },
    { name: 'Kopi Susu Gula Aren', price: 25000, slug: 'kopi', description: 'Signature espresso, fresh milk, & gula aren murni', isAvailable: true, isRecommended: true, isBestSeller: false },
    { name: 'Cafe Latte', price: 28000, slug: 'kopi', description: 'Espresso dengan steamed milk lembut', isAvailable: true, isRecommended: false, isBestSeller: false },
    { name: 'Cappuccino', price: 28000, slug: 'kopi', description: 'Espresso dengan foam susu tebal & taburan cokelat', isAvailable: true, isRecommended: false, isBestSeller: false },

    // Non-Kopi
    { name: 'Matcha Green Tea Latte', price: 30000, slug: 'non-kopi', description: 'Matcha Uji autentik dengan susu segar', isAvailable: true, isRecommended: true, isBestSeller: false },
    { name: 'Chocolate Signature', price: 28000, slug: 'non-kopi', description: 'Cokelat Belgia pekat manis pas', isAvailable: true, isRecommended: false, isBestSeller: false },
    { name: 'Lemon Tea (Fresh Brew)', price: 20000, slug: 'non-kopi', description: 'Teh hitam segar dengan perasan lemon asli', isAvailable: true, isRecommended: false, isBestSeller: false },

    // Makanan Berat
    { name: 'Nasi Goreng Spesial Kafe', price: 35000, slug: 'makanan-berat', description: 'Nasi goreng dengan ayam suwir, telur mata sapi, & kerupuk', isAvailable: true, isRecommended: false, isBestSeller: true },
    { name: 'Mie Goreng Seafood', price: 32000, slug: 'makanan-berat', description: 'Mie telur dengan udang & cumi segar', isAvailable: true, isRecommended: false, isBestSeller: false },
    { name: 'Chicken Katsu Rice Bowl', price: 38000, slug: 'makanan-berat', description: 'Ayam katsu krispi dengan saus teriyaki & telur', isAvailable: true, isRecommended: false, isBestSeller: false },
    { name: 'Spaghetti Carbonara', price: 42000, slug: 'makanan-berat', description: 'Pasta creamy dengan smoked beef & parmesan', isAvailable: true, isRecommended: false, isBestSeller: false },

    // Snack & Pastry
    { name: 'French Fries (Kentang Goreng)', price: 22000, slug: 'snack-pastry', description: 'Kentang goreng gurih renyah dengan saus cocolan', isAvailable: true, isRecommended: false, isBestSeller: false },
    { name: 'Butter Croissant', price: 25000, slug: 'snack-pastry', description: 'Pastry Prancis renyah berlapis mentega', isAvailable: false, isRecommended: false, isBestSeller: true }, // Sample SOLD OUT + Best Seller
    { name: 'Roti Bakar Cokelat Keju', price: 26000, slug: 'snack-pastry', description: 'Roti tebal dengan limpahan cokelat meses & parutan keju', isAvailable: true, isRecommended: false, isBestSeller: false },
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
          isRecommended: prod.isRecommended,
          isBestSeller: prod.isBestSeller,
        },
      });
    } else {
      // Re-seed idempoten: update HANYA flag kurasi, jangan sentuh isAvailable
      // (status Sold Out live hasil toggle kasir tidak boleh di-reset seeder).
      await prisma.product.update({
        where: { id: existing.id },
        data: { isRecommended: prod.isRecommended, isBestSeller: prod.isBestSeller },
      });
    }
  }
  logger.log(`✅ ${productsData.length} Menu kafe berhasil di-seed (Termasuk sample Sold Out)`);

  logger.log('🎉 Seeding database selesai 100%!');
}

main()
  .catch((e) => {
    logger.error('❌ Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
