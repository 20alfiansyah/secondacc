import { beforeEach, describe, expect, it } from 'vitest'
import { useCartStore } from './cartStore'
import type { Product } from '@/api/client'

const mockAmericano: Product = {
  id: 1,
  name: 'Americano (Hot/Ice)',
  price: 22000,
  categoryId: 1,
  categoryName: 'Kopi',
  description: 'Espresso dengan air mineral segar',
  isAvailable: true,
}

const mockLatte: Product = {
  id: 2,
  name: 'Cafe Latte',
  price: 28000,
  categoryId: 1,
  categoryName: 'Kopi',
  description: 'Espresso dengan steamed milk',
  isAvailable: true,
}

describe('Cart Store - Custom Menu Items', () => {
  beforeEach(() => {
    useCartStore.getState().clear()
  })

  it('menambahkan menu biasa tanpa notes', () => {
    const { addItem } = useCartStore.getState()
    addItem(mockAmericano)

    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].product.name).toBe('Americano (Hot/Ice)')
    expect(items[0].quantity).toBe(1)
    expect(items[0].notes).toBeUndefined()
  })

  it('memisahkan menu yang sama jika memiliki custom notes berbeda (misal: 1 no sugar, 1 normal sugar)', () => {
    const { addItem } = useCartStore.getState()

    // 1 Americano No Sugar
    addItem(mockAmericano, { notes: 'No Sugar, Less Ice', quantity: 1 })
    // 1 Americano Normal Sugar
    addItem(mockAmericano, { notes: 'Normal Sugar, Hot', quantity: 1 })

    const items = useCartStore.getState().items
    expect(items).toHaveLength(2)
    expect(items[0].product.id).toBe(mockAmericano.id)
    expect(items[0].notes).toBe('No Sugar, Less Ice')
    expect(items[0].quantity).toBe(1)

    expect(items[1].product.id).toBe(mockAmericano.id)
    expect(items[1].notes).toBe('Normal Sugar, Hot')
    expect(items[1].quantity).toBe(1)
  })

  it('menggabungkan quantity jika menu dan custom notes sama persis', () => {
    const { addItem } = useCartStore.getState()

    addItem(mockAmericano, { notes: 'No Sugar', quantity: 1 })
    addItem(mockAmericano, { notes: 'No Sugar', quantity: 2 })

    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(3)
    expect(items[0].notes).toBe('No Sugar')
  })

  it('increase dan decrease bekerja spesifik pada id item masing-masing', () => {
    const { addItem, increase, decrease } = useCartStore.getState()

    addItem(mockAmericano, { notes: 'No Sugar', quantity: 1 })
    addItem(mockAmericano, { notes: 'Extra Sweet', quantity: 2 })

    const [itemA, itemB] = useCartStore.getState().items

    increase(itemA.id)
    expect(useCartStore.getState().items.find((i) => i.id === itemA.id)?.quantity).toBe(2)
    expect(useCartStore.getState().items.find((i) => i.id === itemB.id)?.quantity).toBe(2)

    decrease(itemB.id)
    expect(useCartStore.getState().items.find((i) => i.id === itemB.id)?.quantity).toBe(1)

    decrease(itemB.id) // turun ke 0 -> otomatis terhapus
    expect(useCartStore.getState().items.find((i) => i.id === itemB.id)).toBeUndefined()
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('update catatan custom item (setNotes)', () => {
    const { addItem, setNotes } = useCartStore.getState()
    addItem(mockLatte, { notes: 'Normal', quantity: 1 })

    const item = useCartStore.getState().items[0]
    setNotes(item.id, 'Oat Milk, Less Sweet')

    expect(useCartStore.getState().items[0].notes).toBe('Oat Milk, Less Sweet')
  })
})
