import { describe, expect, it } from 'vitest'
import { calculateChange, exactPayment } from './financial'

describe('calculateChange (uang tunai integer)', () => {
  it('menghitung kembalian saat uang lebih dari total', () => {
    expect(calculateChange(56000, 100000)).toBe(44000)
  })

  it('mengembalikan 0 saat uang pas', () => {
    expect(calculateChange(56000, 56000)).toBe(0)
  })

  it('menolak uang kurang dari total', () => {
    expect(() => calculateChange(56000, 50000)).toThrow()
  })

  it('menolak nominal bukan integer (cedera presisi)', () => {
    expect(() => calculateChange(56000, 56000.5)).toThrow()
    expect(() => calculateChange(56000.1, 100000)).toThrow()
  })

  it('menolak total negatif', () => {
    expect(() => calculateChange(-1000, 5000)).toThrow()
  })
})

describe('exactPayment (uang pas)', () => {
  it('mengembalikan total sebagai nominal uang pas', () => {
    expect(exactPayment(75000)).toBe(75000)
  })
})
