import { describe, expect, it } from 'vitest'
import { adminStats, adminUsers } from './admin'
import { getDb } from './db/client'

/**
 * Read-only smoke test against a real database. Skipped unless DATABASE_URL is set, e.g.
 *   DATABASE_URL="$(grep ^DATABASE_URL .dev.vars | cut -d= -f2-)" npx vitest run server/admin.db.test.ts
 */
const url = process.env.DATABASE_URL

describe.skipIf(!url)('admin queries (live database)', () => {
  it('computes stats with full time series', async () => {
    const stats = await adminStats(getDb(url!))
    expect(stats.users.total).toBeGreaterThanOrEqual(0)
    expect(stats.signupsByWeek).toHaveLength(12)
    expect(stats.activityByDay).toHaveLength(14)
    expect(stats.users.active7d).toBeLessThanOrEqual(stats.users.total)
  })

  it('lists users with activity counts', async () => {
    const { users, total } = await adminUsers(getDb(url!))
    expect(users.length).toBeLessThanOrEqual(total)
    for (const u of users) {
      expect(typeof u.id).toBe('string')
      expect(u.createdAt).toMatch(/^\d{4}-/)
    }
  })
})
