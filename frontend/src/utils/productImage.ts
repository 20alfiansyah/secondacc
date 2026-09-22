import type { Product } from '@/api/client'
import { getProductImage } from '@/utils/productImages'

/**
 * Resolve gambar produk: URL eksternal (http/s) maupun file upload lokal
 * (path "/uploads/..." yang dilayani nginx) dipakai apa adanya. Kalau blank
 * atau placeholder data: URI (SVG dari seed), pakai mapping getProductImage
 * agar tampil foto real (hindari image broken/blank).
 */
export function resolveProductImage(p: Product): string {
  const url = p.imageUrl
  if (!url || url.startsWith('data:')) return getProductImage(p.name, p.categoryName)
  return url
}
