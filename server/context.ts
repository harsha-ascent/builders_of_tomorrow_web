import type { Db } from './db/client'
import type { Env } from './env'

export interface AuthInfo {
  userId: string
  /** Set by requireAdmin: the verified primary email of the signed-in admin. */
  email?: string
  isAdmin?: boolean
}

export type AppEnv = {
  Bindings: Env
  Variables: {
    db: Db
    auth: AuthInfo
  }
}
