import { describe, expect, it } from 'vitest'
import { DEFAULT_ADMIN_EMAILS, adminEmails, isAdminEmail } from './admin'

describe('admin allow-list', () => {
  it('defaults to the site owner when ADMIN_EMAILS is unset or blank', () => {
    expect([...adminEmails({})]).toEqual(DEFAULT_ADMIN_EMAILS)
    expect([...adminEmails({ ADMIN_EMAILS: '  ' })]).toEqual(DEFAULT_ADMIN_EMAILS)
    expect(isAdminEmail('harsha@ascent-i-tech.in', {})).toBe(true)
  })

  it('parses a comma-separated list, ignoring case and whitespace', () => {
    const env = { ADMIN_EMAILS: ' Owner@Example.com, helper@example.com ,' }
    expect(isAdminEmail('owner@example.com', env)).toBe(true)
    expect(isAdminEmail('HELPER@example.com ', env)).toBe(true)
    expect(isAdminEmail('harsha@ascent-i-tech.in', env)).toBe(false)
  })

  it('rejects missing emails', () => {
    expect(isAdminEmail(null, {})).toBe(false)
    expect(isAdminEmail('', {})).toBe(false)
    expect(isAdminEmail(undefined, {})).toBe(false)
  })
})
