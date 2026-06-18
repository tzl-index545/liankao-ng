export const RATING_BANDS = [
  { min: -Infinity, max: 1000, color: '#808080', label: 'Newbie' },
  { min: 1000, max: 1400, color: '#008000', label: 'Pupil' },
  { min: 1400, max: 1700, color: '#0000ff', label: 'Expert' },
  { min: 1700, max: 2000, color: '#ff8c00', label: 'Master' },
  { min: 2000, max: Infinity, color: '#ff0000', label: 'Grandmaster' }
]

export const DEFAULT_RATING_COLOR = RATING_BANDS[0].color

export const toRatingNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export const getRatingBand = (rating) => {
  const numeric = toRatingNumber(rating)
  if (numeric === null) return null
  return RATING_BANDS.find((band) => numeric >= band.min && numeric < band.max) || null
}

export const getRatingColor = (rating, fallback = DEFAULT_RATING_COLOR) => {
  return getRatingBand(rating)?.color || fallback
}
