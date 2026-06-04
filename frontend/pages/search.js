import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiSearch } from 'react-icons/fi'
import { API_BASE } from '../lib/config'
import MovieCard from '../components/MovieCard'

export default function Search() {
  const [query, setQuery] = useState('')
  const [k, setK] = useState(10)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState(null)

  async function onSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), k: Number(k) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.detail || 'Search failed')
      }
      setResults(
        (data.results || []).map((r) => ({
          title: r.title,
          score: r.score,
          movie_id: r.movie_id,
          explanation: r.explanation,
        }))
      )
    } catch (err) {
      console.error(err)
      setError(err.message || 'Search failed')
      setResults([])
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-olive-950">
      {/* Hero Section */}
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
              Search Movies
            </h1>
            <p className="text-lg text-olive-200 mb-6 max-w-2xl">
              Find movies by title, genre, or mood. Discover your next favorite film.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Search Form */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={onSearch}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row gap-4 bg-olive-900 p-6 rounded-lg border border-olive-800">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by movie title, actor, or keyword..."
              className="search-input flex-1"
            />
            <input
              value={k}
              onChange={e => setK(e.target.value)}
              type="number"
              min="1"
              max="50"
              className="search-input md:w-20"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading || !query.trim()}
              className="btn btn-primary flex items-center gap-2 justify-center"
            >
              <FiSearch /> {loading ? 'Searching...' : 'Search'}
            </motion.button>
          </div>
        </motion.form>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-8 h-8 border-3 border-olive-700 border-t-olive-400 rounded-full"
            />
          </div>
        )}

        {/* Results */}
        {!loading && searched && results.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              {results.length} Results Found
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {results.map((r, i) => (
                <motion.div
                  key={i}
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

        {!loading && searched && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-olive-300 text-lg">
              {error || 'No movies found. Try a different search!'}
            </p>
          </motion.div>
        )}

        {!searched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-olive-400 text-lg">Enter a search query to get started</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
