import type { Product } from '@/api/client'
import { getProductImage } from '@/utils/productImages'

/**
 * Resolve gambar produk: pakai imageUrl dari backend bila benar-benar gambar
 * eksternal; kalau placeholder (mis. SVG kosong dari seed) atau blank, pakai
 * mapping getProductImage agar tampil foto real (hindari image broken/blank).
 */
export function resolveProductImage(p: Product): string {
  const url = p.imageUrl
  if (url && /^https?:\/\//.test(url)) return url
  return getProductImage(p.name, p.categoryName)
}
