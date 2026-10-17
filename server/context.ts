import type { Db } from './db/client'
import type { Env } from './env'

export interface AuthInfo {
  userId: string
}

export type AppEnv = {
  Bindings: Env
  Variables: {
    db: Db
    auth: AuthInfo
  }
}
