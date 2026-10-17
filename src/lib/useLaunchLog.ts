import type { LaunchRecord } from '../../shared/types'
import { WORKSHOP_WATER_ROCKET } from '../sim/presets'
import { useTestLog } from './useTestLog'

/** Rocket flight log: a thin wrapper over the generic test log. */
export function useLaunchLog() {
  const log = useTestLog<LaunchRecord>(WORKSHOP_WATER_ROCKET)
  return {
    launches: log.records,
    loading: log.loading,
    refresh: log.refresh,
    addLaunch: log.addRecord,
    deleteLaunch: log.deleteRecord,
    clearAll: log.clearAll,
    remote: log.remote,
  }
}
