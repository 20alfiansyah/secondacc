import { PrismaClient, Role, PaymentCategory } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Slug helper untuk kategori (kebab-case)
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedUsers() {
  const users = [
    {
      username: 'admin',
      password: 'admin123',
      name: 'Administrator',
      role: Role.ADMIN,
    },
    {
      username: 'siti',
      password: 'kasir123',
      name: 'Siti',
      role: Role.CASHIER,
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        passwordHash,
        name: u.name,
        role: u.role,
        isActive: true,
      },
      create: {
        username: u.username,
        passwordHash,
        name: u.name,
        role: u.role,
      },
    });
    console.log(`✔ User: ${u.username} (${u.role})`);
  }
}

async function seedCategories() {
  const categories = [
    'Coffee',
    'Mocktails',
    'Non-Coffee',
    'Main Course',
    'Pastry & Snacks',
  ];

  const created: Record<string, number> = {};
  for (const name of categories) {
    const slug = slugify(name);
    const cat = await prisma.category.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    created[name] = cat.id;
    console.log(`✔ Category: ${name} (${slug})`);
  }
  return created;
}

interface SeedProduct {
  name: string;
  category: string;
  price: number;
  description: string;
  isRecommended?: boolean;
  isBestSeller?: boolean;
}

// Harga dalam Rupiah bulat (satuan sen = 0; Integer Rupiah).
// Foto dummy: karena belum ada endpoint upload, gunakan path placeholder future
// di bawah /uploads/products (Task 2.2 menambahkan storage lokal). SVG data URI
// kosong agar kolom image_url tidak null dan tampil case jika di-render.
const products: SeedProduct[] = [
  // ☕ Coffee
  {
    name: 'Espresso',
    category: 'Coffee',
    price: 18000,
    description: 'Single shot espresso pekat, robusta & arabika blend.',
    isRecommended: true,
  },
  {
    name: 'Cappuccino',
    category: 'Coffee',
    price: 28000,
    description: 'Espresso dengan steamed milk dan foam tebal.',
    isBestSeller: true,
  },
  {
    name: 'Kopi Susu Gula Aren',
    category: 'Coffee',
    price: 25000,
    description: 'Kopi susu kekinian dengan gula aren cair.',
    isRecommended: true,
    isBestSeller: true,
  },
  {
    name: 'Cold Brew',
    category: 'Coffee',
    price: 32000,
    description: 'Kopi seduh dingin 12 jam, smooth dan rendah asam.',
    isRecommended: true,
  },
  // 🍹 Mocktails
  {
    name: 'Lychee Splash',
    category: 'Mocktails',
    price: 30000,
    description: 'Lychee, soda, dan perasan lemon segar.',
    isBestSeller: true,
  },
  {
    name: 'Mojito Mint',
    category: 'Mocktails',
    price: 28000,
    description: 'Mint segar, jeruk nipis, dan soda.',
    isRecommended: true,
  },
  {
    name: 'Strawberry Smash',
    category: 'Mocktails',
    price: 32000,
    description: 'Strawberry segar, sirup, dan sparkling water.',
  },
  // 🍵 Non-Coffee
  {
    name: 'Matcha Latte',
    category: 'Non-Coffee',
    price: 30000,
    description: 'Matcha premium dengan steamed milk.',
    isRecommended: true,
  },
  {
    name: 'Chocolate Hazelnut',
    category: 'Non-Coffee',
    price: 28000,
    description: 'Cokelat kental dengan sentuhan hazelnut.',
    isBestSeller: true,
  },
  {
    name: 'Thai Tea',
    category: 'Non-Coffee',
    price: 26000,
    description: 'Teh Thailand klasik dengan susu kental manis.',
  },
  // 🍽️ Main Course
  {
    name: 'Nasi Goreng Spesial',
    category: 'Main Course',
    price: 38000,
    description: 'Nasi goreng dengan telur, ayam suwir, dan kerupuk.',
    isRecommended: true,
    isBestSeller: true,
  },
  {
    name: 'Mie Goreng Jawa',
    category: 'Main Course',
    price: 35000,
    description: 'Mie goreng jawa manis gurih dengan topping bakso.',
  },
  {
    name: 'Chicken Katsu Rice',
    category: 'Main Course',
    price: 42000,
    description: 'Ayam katsu renyah dengan nasi dan saus khas.',
    isRecommended: true,
  },
  // 🥐 Pastry & Snacks
  {
    name: 'Croissant Butter',
    category: 'Pastry & Snacks',
    price: 20000,
    description: 'Croissant bermentega, luar renyah dalam lembut.',
    isRecommended: true,
  },
  {
    name: 'Cheese Cake Slice',
    category: 'Pastry & Snacks',
    price: 30000,
    description: 'Cheesecake creamy dengan base biskuit.',
    isBestSeller: true,
  },
  {
    name: 'Kentang Goreng Crispy',
    category: 'Pastry & Snacks',
    price: 22000,
    description: 'French fries gurih renyah, cocok untuk teman minum.',
  },
];

async function seedProducts(categoryIds: Record<string, number>) {
  for (const p of products) {
    const categoryId = categoryIds[p.category];
    if (!categoryId) throw new Error(`Kategori tidak ditemukan: ${p.category}`);

    const exists = await prisma.product.findFirst({
      where: { name: p.name },
    });

    const data = {
      categoryId,
      name: p.name,
      price: p.price,
      description: p.description,
      // Placeholder SVG data URI (kosong) agar imageUrl bukan null
      imageUrl:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>',
      isAvailable: true,
      isRecommended: p.isRecommended ?? false,
      isBestSeller: p.isBestSeller ?? false,
    };

    if (exists) {
      await prisma.product.update({ where: { id: exists.id }, data });
    } else {
      await prisma.product.create({ data });
    }
  }
  console.log(`✔ Product: ${products.length} item`);
}

async function seedPaymentChannels() {
  const channels = [
    { name: 'Tunai', category: PaymentCategory.CASH },
    { name: 'QRIS BCA', category: PaymentCategory.THIRD_PARTY },
    { name: 'EDC Mandiri', category: PaymentCategory.EDC },
  ];

  for (const c of channels) {
    // PaymentChannel tidak punya field unique natural selain id (PK).
    // Idempotency pakai findFirst by name, lalu update atau create.
    const existing = await prisma.paymentChannel.findFirst({
      where: { name: c.name },
    });
    if (existing) {
      await prisma.paymentChannel.update({
        where: { id: existing.id },
        data: { name: c.name, category: c.category, isActive: true },
      });
    } else {
      await prisma.paymentChannel.create({
        data: { name: c.name, category: c.category },
      });
    }
    console.log(`✔ PaymentChannel: ${c.name} (${c.category})`);
  }
}

async function main() {
  console.log('🌱 Mulai seeding...');
  await seedUsers();
  const categoryIds = await seedCategories();
  await seedProducts(categoryIds);
  await seedPaymentChannels();
  console.log('✅ Seeding selesai.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
