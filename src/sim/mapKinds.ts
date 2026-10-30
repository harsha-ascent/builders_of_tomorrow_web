/**
 * Every parameter map the worker can compute, by job name. Imported by the worker; the pages pass the
 * same objects to `useParameterMap`.
 */
import { BRIDGE_MAP } from './bridgeMap'
import { ROCKET_MAP, type MapKind } from './paramMap'

export const MAP_KINDS: Record<string, MapKind<never, unknown>> = {
  [ROCKET_MAP.name]: ROCKET_MAP,
  [BRIDGE_MAP.name]: BRIDGE_MAP,
}
