/**
 * Mapping gambar menu kafe berkualitas tinggi (Unsplash CDN, webp optimized).
 * Dilengkapi fallback cerdas per kategori dan fallback placeholder jika gagal dimuat.
 */

const PRODUCT_IMAGE_MAP: Record<string, string> = {
  // Kopi
  'espresso single':
    'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500&auto=format&fit=crop&q=80',
  'americano (hot/ice)':
    'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=500&auto=format&fit=crop&q=80',
  'kopi susu gula aren':
    'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80',
  'cafe latte':
    'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500&auto=format&fit=crop&q=80',
  cappuccino:
    'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&auto=format&fit=crop&q=80',

  // Non-Kopi
  'matcha green tea latte':
    'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=80',
  'chocolate signature':
    'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500&auto=format&fit=crop&q=80',
  'lemon tea (fresh brew)':
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80',

  // Makanan Berat
  'nasi goreng spesial kafe':
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=80',
  'mie goreng seafood':
    'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
  'chicken katsu rice bowl':
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&auto=format&fit=crop&q=80',
  'spaghetti carbonara':
    'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=500&auto=format&fit=crop&q=80',

  // Snack & Pastry
  'french fries (kentang goreng)':
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80',
  'butter croissant':
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=80',
  'roti bakar cokelat keju':
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80',
}

const CATEGORY_FALLBACK_MAP: Record<string, string> = {
  kopi: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&auto=format&fit=crop&q=80',
  'non-kopi':
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
  'makanan berat':
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=80',
  'snack & pastry':
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
}

export function getProductImage(productName: string, categoryName: string): string {
  const normName = productName.toLowerCase().trim()
  if (PRODUCT_IMAGE_MAP[normName]) {
    return PRODUCT_IMAGE_MAP[normName]
  }

  // Keyword matching
  for (const [key, url] of Object.entries(PRODUCT_IMAGE_MAP)) {
    if (normName.includes(key) || key.includes(normName)) {
      return url
    }
  }

  // Fallback by category
  const normCat = categoryName.toLowerCase().trim()
  for (const [catKey, url] of Object.entries(CATEGORY_FALLBACK_MAP)) {
    if (normCat.includes(catKey) || catKey.includes(normCat)) {
      return url
    }
  }

  return 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&auto=format&fit=crop&q=80'
}
