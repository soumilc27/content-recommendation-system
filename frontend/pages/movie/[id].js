import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FiPlay, FiPlus, FiArrowLeft } from 'react-icons/fi'
import Link from 'next/link'
import { API_BASE } from '../../lib/config'
import MovieCard from '../../components/MovieCard'
import { authFetch, getToken } from '../../lib/auth'

export default function MovieDetail(){
  const router = useRouter()
  const { id } = router.query
  const [movie, setMovie] = useState(null)
  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingWatchlist, setSavingWatchlist] = useState(false)
  const [watchlistMessage, setWatchlistMessage] = useState('')

  useEffect(()=>{
    if(!id) return
    async function load(){
      try{
        const res = await fetch(`${API_BASE}/movie/${id}`)
        if(res.ok){
          const data = await res.json()
          setMovie(data)
          setRecs(data.recommendations || [])
        } else {
          setMovie({ title: `Movie ${id}`, movie_id: Number(id), genres: 'N/A' })
        }
      }catch(e){
        setMovie({ title: `Movie ${id}`, movie_id: Number(id), genres: 'N/A' })
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function addToWatchlist() {
    if (!id || savingWatchlist) return

    const token = getToken()
    if (!token) {
      router.push('/login')
      return
    }

    setSavingWatchlist(true)
    setWatchlistMessage('')

    try {
      const res = await authFetch(`${API_BASE}/users/me/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: Number(id) }),
      })

      if (!res.ok) {
        throw new Error('Unable to save movie')
      }

      setWatchlistMessage('Saved to your wishlist.')
    } catch (error) {
      console.error(error)
      setWatchlistMessage('Could not save this movie right now.')
    } finally {
      setSavingWatchlist(false)
    }
  }

  if(loading) return (
    <div className="min-h-screen bg-olive-950 flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="w-8 h-8 border-3 border-olive-700 border-t-olive-400 rounded-full"
      />
    </div>
  )

  if(!movie) return (
    <div className="min-h-screen bg-olive-950 p-8">
      <p className="text-white text-center">Movie not found</p>
    </div>
  )

  const movieDescription = movie.ai_plot || 'Description details are not available yet.'

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
          <Link href="/">
            <motion.button
              whileHover={{ x: -4 }}
              className="flex items-center gap-2 text-olive-400 hover:text-olive-300 mb-4 transition-colors"
            >
              <FiArrowLeft /> Back
            </motion.button>
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 capitalize">
            {movie.title}
          </h1>

          {movie.genres && (
            <p className="text-lg text-olive-200 mb-6">
              {movie.genres}
            </p>
          )}

          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary flex items-center gap-2"
            >
              <FiPlay /> Watch Now
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={addToWatchlist}
              disabled={savingWatchlist}
              className="btn btn-outline flex items-center gap-2"
            >
              <FiPlus /> {savingWatchlist ? 'Saving...' : 'Add to Watchlist'}
            </motion.button>
          </div>

          {watchlistMessage && (
            <p className="mt-4 text-sm text-olive-300">{watchlistMessage}</p>
          )}
        </div>
      </motion.div>

      {/* Movie Details */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="mb-12 bg-olive-900 rounded-lg p-6 border border-olive-800"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Description</h2>
          <p className="text-olive-200 leading-relaxed">{movieDescription}</p>
        </motion.section>

        {/* Recommendations */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Similar Movies</h2>
          {recs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recs.slice(0, 12).map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <MovieCard movie={r} variant="grid" />
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-olive-300">No recommendations available</p>
          )}
        </motion.section>
      </div>
    </div>
  )
}

