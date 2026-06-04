import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FiBookmark } from 'react-icons/fi'
import { authFetch, getToken } from '../../lib/auth'
import { API_BASE } from '../../lib/config'
import MovieCard from '../../components/MovieCard'
import {
  buildGenreSummary,
  enrichWatchlistItems,
  formatGenreLabel,
  toCardMovie,
} from '../../lib/watchlist'

export default function TasteProfilePage() {
  const router = useRouter()
  const [watchlist, setWatchlist] = useState([])
  const [aiSummary, setAiSummary] = useState('')
  const [tasteWord, setTasteWord] = useState('')
  const [tasteWordExplanation, setTasteWordExplanation] = useState('')
  const [tasteMetrics, setTasteMetrics] = useState(null)
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
        const enriched = await enrichWatchlistItems(Array.isArray(data) ? data : [])
        setWatchlist(enriched)

        const insightsResponse = await authFetch(`${API_BASE}/users/me/watchlist/insights`)
        if (insightsResponse.ok) {
          const insights = await insightsResponse.json()
          setAiSummary(insights.ai_summary || '')
          setTasteWord(insights.taste_word || '')
          setTasteWordExplanation(insights.taste_word_explanation || '')
          setTasteMetrics(insights.taste_metrics || null)
        }
        setError('')
      } catch (requestError) {
        setError(requestError.message || 'Unable to load taste profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const cardMovies = useMemo(
    () => watchlist.map((item) => toCardMovie(item)),
    [watchlist],
  )

  const genreSummary = useMemo(
    () => buildGenreSummary(watchlist),
    [watchlist],
  )

  const maxGenreCount = genreSummary[0]?.[1] || 1
  const diversity = tasteMetrics?.genre_diversity
  const decades = tasteMetrics?.decade_breakdown || []
  const topDirectors = tasteMetrics?.top_directors || []
  const topActors = tasteMetrics?.top_actors || []
  const maxDecadeCount = decades.reduce((max, row) => Math.max(max, row.count), 0) || 1
  const dominantDecade = decades.length
    ? decades.reduce((best, row) => (row.count > best.count ? row : best), decades[0])
    : null

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
          className="relative overflow-hidden rounded-2xl border border-olive-800 bg-gradient-to-br from-olive-900/80 via-olive-950 to-black p-8 mb-8"
        >
          <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_top_right,rgba(183,170,124,0.2),transparent_45%)]" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-olive-400">Movie DNA</p>
              <h1 className="mt-2 text-4xl font-bold">Your taste, distilled</h1>
              <p className="mt-3 max-w-2xl text-olive-300">
                Built from {watchlist.length} saved {watchlist.length === 1 ? 'title' : 'titles'} in your wishlist.
              </p>
            </div>
            {tasteWord ? (
              <div className="max-w-md text-center md:text-right md:ml-auto">
                <p className="text-xs uppercase tracking-[0.25em] text-olive-400">Taste archetype</p>
                <p className="mt-2 text-5xl md:text-6xl font-bold bg-gradient-to-r from-olive-200 via-amber-200 to-olive-400 bg-clip-text text-transparent">
                  {tasteWord}
                </p>
                {tasteWordExplanation && (
                  <p className="mt-3 text-sm leading-relaxed text-olive-300">
                    {tasteWordExplanation}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-olive-400">Save movies to unlock your taste word</p>
            )}
          </div>
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
                <p className="text-olive-300">
                  {watchlist.length > 0
                    ? 'Building your taste insight from your saved movies...'
                    : 'Save a movie to your wishlist to generate a taste profile.'}
                </p>
              )}
            </div>

            <h2 className="text-2xl font-semibold mb-4">Taste signals</h2>
            <div className="space-y-3">
              {genreSummary.length > 0 ? genreSummary.map(([genre, count]) => (
                <div key={genre}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{formatGenreLabel(genre)}</span>
                    <span className="text-olive-300">
                      {count} of {watchlist.length}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-olive-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-olive-500 to-olive-300"
                      style={{ width: `${Math.min(100, (count / maxGenreCount) * 100)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="text-olive-300">
                  {watchlist.length > 0
                    ? 'Genre data is not available for your saved titles yet.'
                    : 'Save movies to your wishlist to build your profile.'}
                </p>
              )}
            </div>
          </div>

          <div className="bg-olive-900/30 border border-olive-800 rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Saved titles</h2>
            <p className="text-olive-300 mb-4">
              {watchlist.length} movie{watchlist.length === 1 ? '' : 's'} in your wishlist
            </p>
            {cardMovies.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {cardMovies.slice(0, 4).map((movie) => (
                  <MovieCard key={movie.movie_id || movie.title} movie={movie} variant="grid" />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-olive-700 p-6 text-center text-olive-300">
                <FiBookmark className="mx-auto text-olive-500" size={28} />
                <p className="mt-3">No saved movies yet.</p>
                <Link href="/search" className="mt-4 inline-block text-olive-200 underline hover:text-white">
                  Browse movies
                </Link>
              </div>
            )}
          </div>
        </div>

        <section className="mb-10 rounded-xl border border-olive-800 bg-olive-900/30 p-6">
          <h2 className="text-2xl font-semibold mb-2">Taste depth</h2>
          <p className="text-olive-300 mb-6 text-sm">
            How varied your saves are across genres, eras, and recurring cast and crew.
          </p>

          {watchlist.length === 0 ? (
            <p className="text-olive-300">Save movies to unlock diversity and era analytics.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-olive-700 bg-olive-950/50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-olive-400">Genre diversity</p>
                {diversity ? (
                  <>
                    <p className="mt-3 text-4xl font-bold text-white">{diversity.label}</p>
                    {diversity.explanation && (
                      <p className="mt-2 text-sm leading-relaxed text-olive-300">
                        {diversity.explanation}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-olive-400">
                      {diversity.unique_genres} unique genres · diversity score {Math.round((diversity.score || 0) * 100)}%
                    </p>
                    <div className="mt-4 h-2 rounded-full bg-olive-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-olive-600 to-amber-400"
                        style={{ width: `${Math.round((diversity.score || 0) * 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-olive-300">Diversity data unavailable.</p>
                )}
              </div>

              <div className="rounded-xl border border-olive-700 bg-olive-950/50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-olive-400">Era breakdown</p>
                {decades.length > 0 ? (
                  <>
                    {dominantDecade && (
                      <p className="mt-3 text-olive-100">
                        You lean toward the <span className="font-semibold text-white">{dominantDecade.decade}</span>
                      </p>
                    )}
                    <div className="mt-4 space-y-2">
                      {decades.map((row) => (
                        <div key={row.decade}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{row.decade}</span>
                            <span className="text-olive-300">{row.count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-olive-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-olive-500 to-olive-300"
                              style={{ width: `${Math.min(100, (row.count / maxDecadeCount) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-olive-300">Release years are not available for your saved titles yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-olive-700 bg-olive-950/50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-olive-400">Recurring directors</p>
                {topDirectors.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {topDirectors.map((person) => (
                      <li key={person.name} className="flex items-center justify-between text-sm">
                        <span className="text-olive-100">{person.name}</span>
                        <span className="rounded-full border border-olive-700 px-2 py-0.5 text-xs text-olive-300">
                          {person.count} {person.count === 1 ? 'title' : 'titles'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-olive-300 text-sm">No overlapping directors across your saves yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-olive-700 bg-olive-950/50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-olive-400">Recurring cast</p>
                {topActors.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {topActors.map((person) => (
                      <li key={person.name} className="flex items-center justify-between text-sm">
                        <span className="text-olive-100">{person.name}</span>
                        <span className="rounded-full border border-olive-700 px-2 py-0.5 text-xs text-olive-300">
                          {person.count} {person.count === 1 ? 'title' : 'titles'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-olive-300 text-sm">No overlapping cast across your saves yet.</p>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="bg-olive-900/30 border border-olive-800 rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-4">Wishlist library</h2>
          {cardMovies.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cardMovies.map((movie) => (
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
