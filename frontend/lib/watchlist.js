import { API_BASE } from './config'

export function parseGenres(genres) {
  if (!genres) return []
  const raw = String(genres).trim()
  if (!raw || ['unknown', 'n/a', 'none'].includes(raw.toLowerCase())) return []
  const parts = raw.includes('|') ? raw.split('|') : raw.split(/\s+/)
  return parts.map((genre) => genre.trim()).filter(Boolean)
}

export function formatGenreLabel(genre) {
  return genre.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

export async function enrichWatchlistItems(items) {
  if (!Array.isArray(items) || items.length === 0) return items

  return Promise.all(
    items.map(async (item) => {
      if (parseGenres(item.movie?.genres).length > 0) return item

      const movieId = item.movie_id ?? item.movie?.movie_id
      if (!movieId) return item

      try {
        const res = await fetch(`${API_BASE}/movie/${movieId}`)
        if (!res.ok) return item
        const detail = await res.json()
        return {
          ...item,
          movie: {
            ...(item.movie || {}),
            movie_id: movieId,
            title: detail.title || item.movie?.title,
            genres: detail.genres || item.movie?.genres,
            year: detail.year ?? item.movie?.year,
            description: detail.description || item.movie?.description,
          },
        }
      } catch {
        return item
      }
    }),
  )
}

export function toCardMovie(item) {
  const movie = item?.movie || item || {}
  const title = movie.title?.trim()
  return {
    movie_id: item?.movie_id ?? movie.movie_id,
    title: title || 'Untitled movie',
    genres: movie.genres,
    year: movie.year,
    description: movie.description,
    avg_rating: movie.avg_rating,
    rating_count: movie.rating_count,
    score: movie.score,
    explanation: movie.explanation,
  }
}

export function buildGenreSummary(items, { minShare = 0 } = {}) {
  const counts = {}
  const savedCount = items.length
  const minCount = savedCount > 0 && minShare > 0 ? Math.ceil(savedCount * minShare) : 1

  items.forEach((item) => {
    parseGenres(item.movie?.genres).forEach((genre) => {
      const key = genre.toLowerCase()
      counts[key] = (counts[key] || 0) + 1
    })
  })

  return Object.entries(counts)
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
}
