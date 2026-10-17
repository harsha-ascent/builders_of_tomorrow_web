import { describe, expect, it } from 'vitest'
import { interestRequestSchema } from './validation'

const good = { name: 'Priya S', email: 'Priya@Example.com ', city: 'Hyderabad', kids: 2 }

describe('in-person interest form', () => {
  it('accepts a minimal submission and fills defaults', () => {
    const r = interestRequestSchema.safeParse(good)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.email).toBe('priya@example.com')
    expect(r.data.workshop).toBe('water-rocket')
    expect(r.data.format).toBe('either')
    expect(r.data.phone).toBe('')
    expect(r.data.website).toBe('')
  })

  it('rejects a bad email, a missing city and silly numbers', () => {
    expect(interestRequestSchema.safeParse({ ...good, email: 'nope' }).success).toBe(false)
    expect(interestRequestSchema.safeParse({ ...good, city: '' }).success).toBe(false)
    expect(interestRequestSchema.safeParse({ ...good, kids: 0 }).success).toBe(false)
    expect(interestRequestSchema.safeParse({ ...good, kids: 2.5 }).success).toBe(false)
    expect(interestRequestSchema.safeParse({ ...good, format: 'zoom' }).success).toBe(false)
  })

  it('keeps the honeypot value so the route can discard bots', () => {
    const r = interestRequestSchema.safeParse({ ...good, website: 'http://spam.example' })
    expect(r.success && r.data.website).toBe('http://spam.example')
  })
})
