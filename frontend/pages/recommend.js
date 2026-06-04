import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FiBookmark, FiLogIn } from 'react-icons/fi'
import { API_BASE } from '../lib/config'
import { authFetch, getToken } from '../lib/auth'
import MovieCard from '../components/MovieCard'

export default function Recommend() {
  const router = useRouter()
  const [k, setK] = useState(12)
  const [results, setResults] = useState([])
  const [summary, setSummary] = useState('')
  const [explanation, setExplanation] = useState('')
  const [wishlistCount, setWishlistCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)

  async function loadWishlistRecommendations(resultCount = k) {
    setLoading(true)
    setError('')

    const token = getToken()
    if (!token) {
      setLoggedIn(false)
      setResults([])
      setSummary('')
      setLoading(false)
      return
    }

    setLoggedIn(true)

    try {
      const res = await authFetch(`${API_BASE}/users/me/watchlist/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ k: Number(resultCount) }),
      })

      if (res.status === 400) {
        const data = await res.json().catch(() => ({}))
        setWishlistCount(0)
        setResults([])
        setSummary('')
        setExplanation('')
        setError(data.detail || 'Add movies to your wishlist to get recommendations.')
        return
      }

      if (!res.ok) {
        throw new Error('Unable to load recommendations')
      }

      const data = await res.json()
      setResults(data.recommended || [])
      setSummary(data.ai_summary || '')
      setExplanation(data.explanation || '')
      setWishlistCount(data.wishlist_count || 0)
      setError('')
    } catch (err) {
      console.error(err)
      setResults([])
      setSummary('')
      setError('Unable to load wishlist recommendations right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWishlistRecommendations(k)
  }, [])

  async function handleRefresh(e) {
    e.preventDefault()
    await loadWishlistRecommendations(k)
  }

  return (
    <div className="min-h-screen bg-olive-950">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="hero mb-8"
        style={{
          backgroundImage: 'linear-gradient(135deg, #2a2620 0%, #413a2d 50%, #524d39 100%)',
        }}
      >
        <div className="hero-content">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Recommendations From Your Wishlist
            </h1>
            <p className="text-lg text-olive-200 mb-6 max-w-2xl">
              Films similar to everything you have saved — no manual search required.
            </p>
          </motion.div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {!loggedIn && !loading && (
          <div className="mb-8 rounded-2xl border border-olive-800 bg-olive-900/70 p-8 text-center">
            <FiLogIn className="mx-auto text-olive-400" size={32} />
            <h2 className="mt-4 text-xl font-semibold text-white">Sign in to see wishlist picks</h2>
            <p className="mt-2 text-olive-300">Recommendations are built from the movies you save.</p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="mt-6 rounded-full bg-olive-500 px-5 py-3 font-semibold text-white hover:bg-olive-400"
            >
              Sign in
            </button>
          </div>
        )}

        {loggedIn && (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleRefresh}
            className="mb-10 flex flex-col gap-4 rounded-lg border border-olive-800 bg-olive-900 p-6 md:flex-row md:items-end"
          >
            <div className="flex-1">
              <p className="text-sm uppercase tracking-[0.2em] text-olive-400">Source</p>
              <p className="mt-2 text-olive-100">
                {wishlistCount > 0
                  ? `Using ${wishlistCount} saved ${wishlistCount === 1 ? 'title' : 'titles'} from your wishlist`
                  : 'Your wishlist is empty'}
              </p>
            </div>
            <label className="text-sm text-olive-300">
              How many picks?
              <input
                value={k}
                onChange={(e) => setK(e.target.value)}
                type="number"
                min="1"
                max="50"
                className="search-input mt-2 md:w-24"
              />
            </label>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading || wishlistCount === 0}
              className="btn btn-primary"
            >
              {loading ? 'Loading...' : 'Refresh picks'}
            </motion.button>
          </motion.form>
        )}

        {error && (
          <div className="mb-8 rounded-2xl border border-dashed border-olive-700 bg-olive-900/50 p-8 text-center">
            <FiBookmark className="mx-auto text-olive-500" size={32} />
            <p className="mt-4 text-olive-200">{error}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/search">
                <span className="inline-flex cursor-pointer rounded-full bg-olive-500 px-5 py-3 font-semibold text-white hover:bg-olive-400">
                  Browse movies
                </span>
              </Link>
              <Link href="/wishlist">
                <span className="inline-flex cursor-pointer rounded-full border border-olive-700 px-5 py-3 font-semibold text-olive-200 hover:border-olive-500 hover:text-white">
                  Open wishlist
                </span>
              </Link>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-8 h-8 border-3 border-olive-700 border-t-olive-400 rounded-full"
            />
          </div>
        )}

        {!loading && results.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {explanation && (
              <p className="mb-4 text-sm text-olive-400">{explanation}</p>
            )}
            {summary && (
              <div className="mb-6 rounded-xl border border-olive-700 bg-olive-900/60 p-5 text-olive-100">
                <p className="text-sm uppercase tracking-wide text-olive-400 mb-2">AI summary</p>
                <p className="text-base leading-relaxed">{summary}</p>
              </div>
            )}
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              {results.length} picks based on your wishlist
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {results.map((r, i) => (
                <motion.div
                  key={r.movie_id || r.title || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <MovieCard movie={r} variant="grid" />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  )
}
