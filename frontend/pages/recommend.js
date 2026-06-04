import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiSearch } from 'react-icons/fi'
import { API_BASE } from '../lib/config'
import MovieCard from '../components/MovieCard'

export default function Recommend() {
  const [title, setTitle] = useState('')
  const [k, setK] = useState(10)
  const [results, setResults] = useState([])
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  async function onRecommend(e) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/recommendations/with-explanations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, k: Number(k) })
      })
      const data = await res.json()
      setResults(data.recommended || [])
      setSummary(data.ai_summary || data.explanation || '')
    } catch (err) {
      console.error(err)
      setResults([])
      setSummary('')
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
              Find Similar Movies
            </h1>
            <p className="text-lg text-olive-200 mb-6 max-w-2xl">
              Enter a movie you like and discover similar films tailored to your taste.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Search Form */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={onRecommend}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row gap-4 bg-olive-900 p-6 rounded-lg border border-olive-800">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Toy Story, The Matrix, Inception..."
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
              disabled={loading || !title.trim()}
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
        {!loading && results.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {summary && (
              <div className="mb-6 rounded-xl border border-olive-700 bg-olive-900/60 p-5 text-olive-100">
                <p className="text-sm uppercase tracking-wide text-olive-400 mb-2">AI summary</p>
                <p className="text-base leading-relaxed">{summary}</p>
              </div>
            )}
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              {results.length} Similar Movies Found
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

        {!loading && title && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-olive-300 text-lg">No movies found. Try a different title!</p>
          </motion.div>
        )}

        {!title && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-olive-400 text-lg">Enter a movie title to get recommendations</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

