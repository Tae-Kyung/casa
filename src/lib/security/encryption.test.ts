import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt, mask } from './encryption'

describe('encryption', () => {
  beforeAll(() => {
    // 테스트용 32바이트 키 (hex)
    process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  })

  it('encrypts and decrypts correctly', () => {
    const plaintext = '1234567890'
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('produces different ciphertext each time (random IV)', () => {
    const plaintext = 'test123'
    const e1 = encrypt(plaintext)
    const e2 = encrypt(plaintext)
    expect(e1).not.toBe(e2)
    expect(decrypt(e1)).toBe(plaintext)
    expect(decrypt(e2)).toBe(plaintext)
  })
})

describe('mask', () => {
  it('masks account number showing last 4 digits', () => {
    expect(mask('1234567890')).toBe('******7890')
  })

  it('handles short numbers', () => {
    expect(mask('12')).toBe('****')
  })

  it('strips non-numeric characters', () => {
    expect(mask('123-456-7890')).toBe('******7890')
  })
})
