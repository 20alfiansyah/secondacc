import { create } from 'zustand'
import type { Product } from '@/api/client'

export interface CartItem {
  id: string // Identifier unik per custom line item
  product: Product
  quantity: number
  notes?: string
}

export interface AddItemOptions {
  notes?: string
  quantity?: number
}

interface CartState {
  items: CartItem[]
  addItem: (product: Product, options?: AddItemOptions) => void
  increase: (id: string) => void
  decrease: (id: string) => void
  setQuantity: (id: string, quantity: number) => void
  setNotes: (id: string, notes: string) => void
  removeItem: (id: string) => void
  clear: () => void
}

function normalizeNotes(notes?: string): string {
  return notes?.trim() || ''
}

export const useCartStore = create<CartState>((set) => ({
  items: [],

  addItem: (product, options) =>
    set((state) => {
      const qty = options?.quantity && options.quantity > 0 ? options.quantity : 1
      const notes = normalizeNotes(options?.notes)

      // Cari item yang produknya sama DAN custom catatannya sama persis
      const existing = state.items.find(
        (i) => i.product.id === product.id && normalizeNotes(i.notes) === notes,
      )

      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === existing.id ? { ...i, quantity: i.quantity + qty } : i,
          ),
        }
      }

      // Jika catatan berbeda (misal 1 Americano no sugar, 1 lagi normal sugar), pisah jadi item tersendiri
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product,
        quantity: qty,
        notes: notes || undefined,
      }

      return { items: [...state.items, newItem] }
    }),

  increase: (id) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, quantity: i.quantity + 1 } : i,
      ),
    })),

  decrease: (id) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === id)
      if (!existing) return state
      if (existing.quantity <= 1) {
        return { items: state.items.filter((i) => i.id !== id) }
      }
      return {
        items: state.items.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity - 1 } : i,
        ),
      }
    }),

  setQuantity: (id, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i,
      ),
    })),

  setNotes: (id, notes) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, notes } : i,
      ),
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),

  clear: () => set({ items: [] }),
}))
