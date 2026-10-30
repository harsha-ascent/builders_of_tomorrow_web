/** Plain-language copy shared by the Load Test page's simple and lab views. */

export const ADVICE: Record<string, string> = {
  buckling: 'It bowed sideways. Make that piece thicker (×2 or ×3 layers) or shorter by adding a joint in the middle.',
  tension: 'The glue joint pulled apart. Add a second piece alongside it, or switch to a material with stronger joints.',
  crush: 'It was crushed end-on. That is rare: try a stronger material.',
  'self-weight': 'It cannot even hold itself up. Use fewer or lighter pieces, or a stronger material.',
}

export const FAIL_LABEL: Record<string, string> = {
  tension: 'the glue joint lets go',
  buckling: 'it buckles sideways',
  crush: 'it is crushed end-on',
  'self-weight': 'it collapses under its own weight',
}

export function weightComparison(kg: number) {
  if (kg < 0.5) return 'about a cup of water'
  if (kg < 1.5) return 'about a bag of sugar'
  if (kg < 3) return 'about a big bottle of cola'
  if (kg < 6) return 'about a house cat'
  if (kg < 12) return 'about a bicycle'
  if (kg < 25) return 'about a full suitcase'
  if (kg < 45) return 'about a ten-year-old'
  if (kg < 80) return 'about a grown-up'
  return 'more than a grown-up!'
}
