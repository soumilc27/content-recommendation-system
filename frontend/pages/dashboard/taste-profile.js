import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { authFetch, getToken } from '../../lib/auth'
import { API_BASE } from '../../lib/config'
import MovieCard from '../../components/MovieCard'

function buildGenreSummary(items) {
  const counts = {}

  items.forEach((item) => {
    const genres = String(item.genres || '')
      .split('|')
      .map((genre) => genre.trim())
      .filter(Boolean)

    genres.forEach((genre) => {
      counts[genre] = (counts[genre] || 0) + 1
    })
  })

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
}

export default function TasteProfilePage() {
  const router = useRouter()
  const [watchlist, setWatchlist] = useState([])
  const [aiSummary, setAiSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login')
      return
    }

    async function loadProfile() {
      try {
        const response = await authFetch(`${API_BASE}/users/me/watchlist`)
        if (!response.ok) {
          throw new Error('Unable to load taste profile')
        }

        const data = await response.json()
        setWatchlist(Array.isArray(data) ? data : [])

        const insightsResponse = await authFetch(`${API_BASE}/users/me/watchlist/insights`)
        if (insightsResponse.ok) {
          const insights = await insightsResponse.json()
          setAiSummary(insights.ai_summary || '')
        }
      } catch (requestError) {
        setError(requestError.message || 'Unable to load taste profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const genreSummary = useMemo(() => buildGenreSummary(watchlist), [watchlist])

  if (loading) {
    return (
      <div className="min-h-screen bg-olive-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-8 h-8 border-3 border-olive-700 border-t-olive-400 rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-olive-950 text-olive-50">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-olive-400 hover:text-olive-300 mb-6">
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-olive-900/40 border border-olive-800 rounded-2xl p-8 mb-8"
        >
          <h1 className="text-4xl font-bold mb-3">Your Movie DNA</h1>
          <p className="text-olive-300 max-w-3xl">
            This view is built from the movies you save. It shows your most common genres and the titles shaping your taste profile.
          </p>
        </motion.div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-700 bg-red-950/40 p-4 text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] mb-10">
          <div className="bg-olive-900/30 border border-olive-800 rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">AI taste insight</h2>
            <div className="rounded-xl border border-olive-700 bg-olive-950/50 p-4 mb-6">
              {aiSummary ? (
                <p className="text-olive-100 leading-relaxed">{aiSummary}</p>
              ) : (
                <p className="text-olive-300">Save a few movies first and I will generate a taste profile.</p>
              )}
            </div>

            <h2 className="text-2xl font-semibold mb-4">Taste signals</h2>
            <div className="space-y-3">
              {genreSummary.length > 0 ? genreSummary.map(([genre, count]) => (
                <div key={genre}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{genre}</span>
                    <span className="text-olive-300">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-olive-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-olive-500 to-olive-300"
                      style={{ width: `${Math.min(100, count * 20)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="text-olive-300">Save a few movies to build your profile.</p>
              )}
            </div>
          </div>

          <div className="bg-olive-900/30 border border-olive-800 rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Saved titles</h2>
            <p className="text-olive-300 mb-4">{watchlist.length} movie{watchlist.length === 1 ? '' : 's'} in your wishlist</p>
            <div className="grid grid-cols-2 gap-3">
              {watchlist.slice(0, 4).map((movie) => (
                <MovieCard key={movie.movie_id || movie.title} movie={movie} variant="grid" />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-olive-900/30 border border-olive-800 rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-4">Wishlist library</h2>
          {watchlist.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {watchlist.map((movie) => (
                <MovieCard key={movie.movie_id || movie.title} movie={movie} variant="grid" />
              ))}
            </div>
          ) : (
            <p className="text-olive-300">No saved movies yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
