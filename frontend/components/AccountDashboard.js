import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FiBookmark, FiCalendar, FiClock, FiLogIn, FiLogOut, FiMail, FiTrash2, FiUser, FiSearch, FiArrowRight } from 'react-icons/fi'
import { API_BASE } from '../lib/config'
import { authFetch, clearToken, getToken } from '../lib/auth'
import { enrichWatchlistItems, formatGenreLabel, parseGenres } from '../lib/watchlist'

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getGenreList(movie) {
  return parseGenres(movie?.genres)
}

function WishlistCard({ item, onRemove }) {
  const genres = getGenreList(item.movie)

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="overflow-hidden rounded-2xl border border-olive-800 bg-olive-900/80 shadow-xl shadow-black/20"
    >
      <div className="flex h-full flex-col">
        <div className="relative aspect-[16/9] bg-gradient-to-br from-olive-700 via-olive-800 to-black p-5">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_45%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-olive-300">
              <span>Wishlist</span>
              <span>{formatDate(item.created_at)}</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white line-clamp-2">{item.movie?.title || 'Untitled movie'}</h3>
              <p className="mt-2 text-sm text-olive-200">
                {item.movie?.year ? `Released ${item.movie.year}` : 'Saved movie'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex flex-wrap gap-2">
            {genres.length > 0 ? (
              genres.slice(0, 4).map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-olive-700 bg-olive-950 px-3 py-1 text-xs text-olive-300"
                >
                  {genre}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-olive-700 bg-olive-950 px-3 py-1 text-xs text-olive-300">
                No genres listed
              </span>
            )}
          </div>

          {item.movie?.description ? (
            <p className="line-clamp-3 text-sm leading-6 text-olive-200">
              {item.movie.description}
            </p>
          ) : (
            <p className="text-sm leading-6 text-olive-400">
              No description is available for this title yet.
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
            <Link href={`/movie/${item.movie_id}`}>
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-olive-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-olive-400">
                <FiBookmark /> Open details
              </span>
            </Link>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onRemove(item.id)}
              className="inline-flex items-center gap-2 rounded-full border border-red-700/70 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:border-red-500 hover:text-white"
            >
              <FiTrash2 /> Remove
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

export default function AccountDashboard({ view = 'profile' }) {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [watchlist, setWatchlist] = useState([])
  const [aiSummary, setAiSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')

  // Compute dynamic user analytics/stats
  const stats = useMemo(() => {
    const genreCounts = {}
    watchlist.forEach((item) => {
      parseGenres(item.movie?.genres).forEach((genre) => {
        const key = genre.toLowerCase()
        genreCounts[key] = (genreCounts[key] || 0) + 1
      })
    })

    const savedCount = watchlist.length
    const minGenreCount = savedCount > 0 ? Math.ceil(savedCount * 0.5) : 0
    const topGenres = Object.entries(genreCounts)
      .filter(([, count]) => count >= minGenreCount)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre)

    return {
      saved: watchlist.length,
      active: profile?.is_active ? 'Active' : 'Inactive',
      topGenres,
    }
  }, [profile, watchlist])

  // Extract all unique genres for the filter selector dropdown
  const availableGenres = useMemo(() => {
    const genres = new Set()
    watchlist.forEach((item) => {
      parseGenres(item.movie?.genres).forEach((genre) => {
        genres.add(genre.toLowerCase())
      })
    })
    return Array.from(genres).sort()
  }, [watchlist])

  // Compute filtered wishlist
  const filteredWatchlist = useMemo(() => {
    return watchlist.filter((item) => {
      const title = (item.movie?.title || '').toLowerCase()
      const description = (item.movie?.description || '').toLowerCase()
      const matchesSearch = title.includes(searchQuery.toLowerCase()) || description.includes(searchQuery.toLowerCase())

      const movieGenres = parseGenres(item.movie?.genres).map((g) => g.toLowerCase())
      const matchesGenre = !selectedGenre || movieGenres.includes(selectedGenre.toLowerCase())

      return matchesSearch && matchesGenre
    })
  }, [watchlist, searchQuery, selectedGenre])

  useEffect(() => {
    async function load() {
      const token = getToken()
      if (!token) {
        setError('Sign in to view your profile and wishlist.')
        setLoading(false)
        return
      }

      try {
        const [profileRes, watchlistRes] = await Promise.all([
          authFetch(`${API_BASE}/users/me`),
          authFetch(`${API_BASE}/users/me/watchlist`),
        ])

        if (!profileRes.ok) {
          throw new Error('Unable to load profile data.')
        }

        const profileData = await profileRes.json()
        const watchlistData = watchlistRes.ok ? await watchlistRes.json() : []
        const enrichedWatchlist = await enrichWatchlistItems(
          Array.isArray(watchlistData) ? watchlistData : [],
        )

        setProfile(profileData)
        setWatchlist(enrichedWatchlist)

        const insightsRes = await authFetch(`${API_BASE}/users/me/watchlist/insights`)
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json()
          setAiSummary(insightsData.ai_summary || '')
        }
        setError('')
      } catch (err) {
        console.error(err)
        setError('Unable to load account data right now.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  async function refreshInsights(nextWatchlist) {
    if (!nextWatchlist.length) {
      setAiSummary('')
      return
    }

    try {
      const insightsRes = await authFetch(`${API_BASE}/users/me/watchlist/insights`)
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json()
        setAiSummary(insightsData.ai_summary || '')
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleRemove(watchlistId) {
    if (!confirm('Remove this movie from your wishlist?')) return

    try {
      const res = await authFetch(`${API_BASE}/users/me/watchlist/${watchlistId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to remove item')
      }

      const nextWatchlist = watchlist.filter((item) => item.id !== watchlistId)
      setWatchlist(nextWatchlist)
      await refreshInsights(nextWatchlist)
    } catch (err) {
      console.error(err)
      alert('Could not remove the movie from your wishlist.')
    }
  }

  function handleLogout() {
    clearToken()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-olive-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="h-8 w-8 rounded-full border-3 border-olive-700 border-t-olive-300"
        />
      </div>
    )
  }

  if (error && !profile) {
    return (
      <main className="min-h-screen bg-olive-950 px-4 py-16">
        <div className="mx-auto max-w-4xl rounded-3xl border border-olive-800 bg-olive-900/70 p-8 text-center shadow-2xl shadow-black/20">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-olive-800 text-olive-200">
            <FiLogIn size={28} />
          </div>
          <h1 className="text-3xl font-bold text-white">Profile and Wishlist</h1>
          <p className="mx-auto mt-3 max-w-2xl text-olive-300">{error}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => router.push('/login')}
              className="rounded-full bg-olive-500 px-5 py-3 font-semibold text-white transition-colors hover:bg-olive-400"
            >
              Sign in
            </button>
            <Link href="/">
              <span className="inline-flex cursor-pointer items-center rounded-full border border-olive-700 px-5 py-3 font-semibold text-olive-200 transition-colors hover:border-olive-500 hover:text-white">
                Browse movies
              </span>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const subtitle =
    view === 'wishlist'
      ? 'Everything you have saved to revisit later.'
      : 'A quick overview of your account and saved movies.'

  // ==========================================
  // PROFILE VIEW
  // ==========================================
  if (view === 'profile') {
    return (
      <main className="min-h-screen bg-olive-950">
        <section className="relative overflow-hidden border-b border-olive-800 bg-gradient-to-br from-olive-900 via-olive-950 to-black">
          <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top_right,rgba(183,170,124,0.25),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_35%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
            <div className="flex flex-col md:flex-row items-center gap-6 max-w-4xl">
              {/* Profile Avatar Icon Banner */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-olive-600 to-amber-500 flex items-center justify-center border-4 border-olive-800 shadow-xl text-white text-3xl font-bold uppercase select-none">
                {profile?.username ? profile.username.charAt(0) : <FiUser />}
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-olive-700 bg-olive-950/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-olive-300">
                  <FiUser /> Account Dashboard
                </div>
                <h1 className="text-4xl font-bold text-white md:text-5xl">
                  Welcome back, {profile?.username || 'Cinephile'}!
                </h1>
                <p className="mt-3 text-lg leading-8 text-olive-200">{subtitle}</p>

                {profile && (
                  <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3 text-sm text-olive-200">
                    <span className="inline-flex items-center gap-2 rounded-full border border-olive-700 bg-olive-950/70 px-4 py-2">
                      <FiMail /> {profile.email || 'Email not set'}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-olive-700 bg-olive-950/70 px-4 py-2">
                      <FiCalendar /> Joined {formatDate(profile.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-olive-700 bg-olive-950/70 px-4 py-2">
                      <FiClock /> {stats.active}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
          {/* AI taste insight */}
          <section className="mb-10 rounded-3xl border border-olive-800 bg-olive-900/70 p-6 shadow-xl shadow-black/20 md:p-8">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-white">AI taste insight</h2>
              <span className="rounded-full border border-olive-700 bg-olive-950 px-3 py-1 text-xs uppercase tracking-[0.2em] text-olive-300">
                Active
              </span>
            </div>
            <p className="text-olive-200 leading-7 font-light">
              {aiSummary || (watchlist.length > 0
                ? 'Building your taste insight from your saved movies...'
                : 'Save a movie to your wishlist to generate a taste profile.')}
            </p>
          </section>

          {/* Stats Analytics Row */}
          <section className="mb-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-olive-800 bg-olive-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-olive-400">Saved titles</p>
              <p className="mt-3 text-4xl font-bold text-white">{stats.saved}</p>
            </div>
            <div className="rounded-2xl border border-olive-800 bg-olive-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-olive-400">Top Genres</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {stats.topGenres.length > 0 ? (
                  stats.topGenres.map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-olive-950 border border-olive-800 px-3 py-1 text-xs text-olive-300 font-medium"
                    >
                      {formatGenreLabel(g)}
                    </span>
                  ))
                ) : (
                  <span className="text-olive-300">
                    {watchlist.length > 0
                      ? 'No genre appears in at least half of your saved titles yet'
                      : 'Save movies to see top genres'}
                  </span>
                )}

              </div>
            </div>
            <div className="rounded-2xl border border-olive-800 bg-olive-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-olive-400">Quick actions</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/search">
                  <span className="inline-flex cursor-pointer items-center rounded-full bg-olive-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-olive-400">
                    Search movies
                  </span>
                </Link>
                <Link href="/recommend">
                  <span className="inline-flex cursor-pointer items-center rounded-full border border-olive-700 px-4 py-2 text-xs font-semibold text-olive-200 transition-colors hover:border-olive-500 hover:text-white">
                    Get recommendations
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-red-700/70 bg-red-950/40 px-4 py-2 text-xs font-semibold text-red-200 transition-colors hover:border-red-500 hover:text-white"
                >
                  <FiLogOut size={14} /> Log out
                </button>
              </div>
            </div>
          </section>

          {/* Recently Saved Preview */}
          <section>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Recent Saved Movies</h2>
                <p className="mt-2 text-olive-300">The latest additions to your wishlist.</p>
              </div>
              {watchlist.length > 3 && (
                <Link href="/wishlist">
                  <span className="text-sm font-semibold text-olive-300 transition-colors hover:text-white flex items-center gap-1 cursor-pointer">
                    View Full Wishlist <FiArrowRight size={14} />
                  </span>
                </Link>
              )}
            </div>

            {watchlist.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {watchlist.slice(0, 3).map((item) => (
                  <WishlistCard key={item.id} item={item} onRemove={handleRemove} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-olive-800 bg-olive-900/50 p-10 text-center">
                <FiBookmark className="mx-auto text-olive-500" size={32} />
                <h3 className="mt-4 text-xl font-semibold text-white">Your wishlist is empty</h3>
                <p className="mx-auto mt-3 max-w-2xl text-olive-300">
                  Save a movie from its detail page and it will show up here for easy access later.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link href="/search">
                    <span className="inline-flex cursor-pointer items-center rounded-full bg-olive-500 px-5 py-3 font-semibold text-white transition-colors hover:bg-olive-400">
                      Search movies
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    )
  }

  // ==========================================
  // WISHLIST VIEW
  // ==========================================
  return (
    <main className="min-h-screen bg-olive-950">
      <section className="relative overflow-hidden border-b border-olive-800 bg-gradient-to-br from-olive-900 via-olive-950 to-black">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top_right,rgba(183,170,124,0.25),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_35%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-olive-700 bg-olive-950/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-olive-300">
            <FiBookmark /> Collection
          </div>
          <h1 className="text-4xl font-bold text-white md:text-5xl">Your Wishlist</h1>
          <p className="mt-3 text-lg leading-8 text-olive-200">
            Everything you have saved to revisit later. Displaying {filteredWatchlist.length} of {watchlist.length}{' '}
            titles.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        {/* Search and Filters Bar */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 bg-olive-900/40 p-6 rounded-2xl border border-olive-800">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-olive-400" size={18} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wishlist by title or description..."
              className="w-full bg-olive-950/80 border border-olive-800 rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-olive-400 focus:outline-none focus:border-olive-500 text-sm transition-colors"
            />
          </div>
          {availableGenres.length > 0 && (
            <div className="md:w-64">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-olive-950/80 border border-olive-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-olive-500 text-sm transition-colors capitalize"
              >
                <option value="">All Genres</option>
                {availableGenres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Wishlist Grid */}
        <section>
          {filteredWatchlist.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredWatchlist.map((item) => (
                <WishlistCard key={item.id} item={item} onRemove={handleRemove} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-olive-800 bg-olive-900/50 p-12 text-center">
              <FiBookmark className="mx-auto text-olive-500" size={32} />
              <h3 className="mt-4 text-xl font-semibold text-white">No matching titles</h3>
              <p className="mx-auto mt-2 max-w-md text-olive-300">
                We couldn't find any movies in your wishlist that match your search terms or genre filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedGenre('')
                }}
                className="mt-6 rounded-full border border-olive-750 hover:border-olive-500 px-5 py-2.5 text-sm font-semibold text-olive-200 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
