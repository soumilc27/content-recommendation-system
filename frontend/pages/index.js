import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiSearch, FiArrowRight } from 'react-icons/fi'
import Link from 'next/link'
import { API_BASE } from '../lib/config'
import MovieCard from '../components/MovieCard'

export default function Home() {
  const [moods, setMoods] = useState([])
  const [selectedMood, setSelectedMood] = useState('happy')
  const [recommendations, setRecommendations] = useState([])
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  const moodOptions = [
    { value: 'happy', label: '😊 Happy', color: 'from-yellow-500 to-orange-500' },
    { value: 'sad', label: '😢 Sad', color: 'from-blue-500 to-indigo-500' },
    { value: 'excited', label: '🎬 Excited', color: 'from-red-500 to-pink-500' },
    { value: 'relaxed', label: '😌 Relaxed', color: 'from-green-500 to-teal-500' },
    { value: 'curious', label: '🔍 Curious', color: 'from-purple-500 to-pink-500' },
  ]

  useEffect(() => {
    loadRecommendations()
  }, [selectedMood])

  async function loadRecommendations() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/recommendations/with-explanations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: selectedMood, k: 12 })
      })
      const data = await res.json()
      setRecommendations(data.recommended || [])
      setSummary(data.ai_summary || data.explanation || '')
    } catch (err) {
      console.error(err)
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
        transition={{ duration: 0.8 }}
        className="hero relative mb-8"
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
              Discover Your Next <span className="text-olive-400">Favorite Film</span>
            </h1>
            <p className="text-lg text-olive-200 mb-6 max-w-2xl">
              Get personalized movie recommendations based on your mood and preferences. Explore thousands of films tailored just for you.
            </p>
            <Link href="/search">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-primary flex items-center gap-2 text-lg"
              >
                <FiSearch /> Start Exploring
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Mood Selection */}
      <div className="movie-row">
        <h2 className="movie-row-title">How are you feeling?</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {moodOptions.map((mood) => (
            <motion.button
              key={mood.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedMood(mood.value)}
              className={`relative p-4 rounded-lg font-semibold transition-all overflow-hidden group ${
                selectedMood === mood.value
                  ? `bg-gradient-to-r ${mood.color} text-white shadow-lg`
                  : 'bg-olive-900 text-olive-200 hover:bg-olive-800 border border-olive-800'
              }`}
            >
              <div className="relative z-10">{mood.label}</div>
              {selectedMood === mood.value && (
                <motion.div
                  layoutId="mood-indicator"
                  className="absolute inset-0 bg-gradient-to-r opacity-20"
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="movie-row">
        <div className="flex items-center justify-between mb-6">
          <h2 className="movie-row-title">Top Picks for You</h2>
          <Link href="/recommend">
            <motion.button
              whileHover={{ x: 4 }}
              className="flex items-center gap-2 text-olive-400 hover:text-olive-300 font-semibold"
            >
              View All <FiArrowRight />
            </motion.button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-8 h-8 border-3 border-olive-700 border-t-olive-400 rounded-full"
            />
          </div>
        ) : (
          <>
            {summary && (
              <div className="mb-6 rounded-xl border border-olive-700 bg-olive-900/60 p-5 text-olive-100">
                <p className="text-sm uppercase tracking-wide text-olive-400 mb-2">AI summary</p>
                <p className="text-base leading-relaxed">{summary}</p>
              </div>
            )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {recommendations.slice(0, 12).map((movie, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <MovieCard movie={movie} variant="grid" />
              </motion.div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* New Features Section - With Movie DNA Link */}
      <div className="movie-row py-12">
        <h2 className="movie-row-title mb-8">Why CineMind?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Smart Recommendations', desc: 'AI-powered suggestions based on your mood and preferences' },
            { title: 'Vast Library', desc: 'Browse thousands of movies with detailed information' },
            { title: 'Your Movie DNA', desc: 'Visualize your taste profile with interactive charts', link: '/dashboard/taste-profile' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-olive-900 border border-olive-800 rounded-lg p-6 hover:border-olive-600 transition-all group cursor-pointer"
            >
              {feature.link ? (
                <Link href={feature.link}>
                  <h3 className="text-xl font-bold text-olive-300 mb-3 group-hover:text-olive-200">{feature.title}</h3>
                  <p className="text-olive-200">{feature.desc}</p>
                </Link>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-olive-300 mb-3">{feature.title}</h3>
                  <p className="text-olive-200">{feature.desc}</p>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

