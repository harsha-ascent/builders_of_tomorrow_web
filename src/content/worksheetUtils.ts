import type { Worksheet } from './water-rocket/worksheets'

/** Number of items a learner can actually answer (info boxes do not count). */
export function answerableCount(ws: Worksheet) {
  return ws.sections.reduce((n, s) => n + s.items.filter((i) => i.type !== 'info').length, 0)
}
