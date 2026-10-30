/** Number formatting for readouts: fixed decimals, thousands separators, an em dash when not finite. */
export function fmtNum(v: number, digits: number) {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
