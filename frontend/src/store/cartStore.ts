import { create } from 'zustand'
import type { Product } from '@/api/client'

export interface CartItem {
  product: Product
  quantity: number
  notes?: string
}

interface CartState {
  items: CartItem[]
  addItem: (product: Product) => void
  increase: (productId: number) => void
  decrease: (productId: number) => void
  setNotes: (productId: number, notes: string) => void
  clear: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        }
      }
      return { items: [...state.items, { product, quantity: 1 }] }
    }),

  increase: (productId) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i,
      ),
    })),

  decrease: (productId) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === productId)
      if (!existing) return state
      if (existing.quantity <= 1) {
        return { items: state.items.filter((i) => i.product.id !== productId) }
      }
      return {
        items: state.items.map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i,
        ),
      }
    }),

  setNotes: (productId, notes) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, notes } : i,
      ),
    })),

  clear: () => set({ items: [] }),
}))
