import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiArrowRight, FiZap } from 'react-icons/fi'
import Link from 'next/link'
import { API_BASE } from '../lib/config'
import MovieCard from '../components/MovieCard'

const moodOptions = [
  {
    value: 'happy',
    emoji: '😊',
    title: 'Happy',
    tagline: 'Warm, uplifting stories',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    glow: 'shadow-[0_0_40px_-8px_rgba(251,191,36,0.55)]',
    ring: 'ring-amber-400/60',
    orb: 'bg-amber-400/25',
  },
  {
    value: 'sad',
    emoji: '😢',
    title: 'Sad',
    tagline: 'Reflective & emotional',
    gradient: 'from-sky-500 via-blue-600 to-indigo-700',
    glow: 'shadow-[0_0_40px_-8px_rgba(59,130,246,0.55)]',
    ring: 'ring-blue-400/60',
    orb: 'bg-blue-400/25',
  },
  {
    value: 'excited',
    emoji: '🎬',
    title: 'Excited',
    tagline: 'High energy & thrills',
    gradient: 'from-rose-500 via-red-600 to-fuchsia-600',
    glow: 'shadow-[0_0_40px_-8px_rgba(244,63,94,0.55)]',
    ring: 'ring-rose-400/60',
    orb: 'bg-rose-400/25',
  },
  {
    value: 'relaxed',
    emoji: '😌',
    title: 'Relaxed',
    tagline: 'Calm, cozy viewing',
    gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    glow: 'shadow-[0_0_40px_-8px_rgba(52,211,153,0.55)]',
    ring: 'ring-emerald-400/60',
    orb: 'bg-emerald-400/25',
  },
  {
    value: 'curious',
    emoji: '🔍',
    title: 'Curious',
    tagline: 'Odd, clever discoveries',
    gradient: 'from-violet-500 via-purple-600 to-fuchsia-600',
    glow: 'shadow-[0_0_40px_-8px_rgba(167,139,250,0.55)]',
    ring: 'ring-violet-400/60',
    orb: 'bg-violet-400/25',
  },
]

export default function Home() {
  const [selectedMood, setSelectedMood] = useState('happy')
  const [recommendations, setRecommendations] = useState([])
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  const activeMood = moodOptions.find((m) => m.value === selectedMood) || moodOptions[0]

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
      <section className="movie-row">
        <div className="relative overflow-hidden rounded-3xl border border-olive-800/80 bg-olive-900/30 p-6 md:p-10 backdrop-blur-md">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-olive-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-olive-400">Mood engine</p>
              <h2 className="mt-2 text-3xl md:text-4xl font-bold text-white">How are you feeling?</h2>
              <p className="mt-2 max-w-xl text-olive-300">
                Pick a vibe and we&apos;ll reshape your lineup instantly — no search required.
              </p>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMood.value}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="inline-flex items-center gap-2 rounded-full border border-olive-700/80 bg-olive-950/70 px-4 py-2 text-sm text-olive-200"
              >
                <FiZap className="text-amber-300" size={14} />
                <span>
                  Curating for <span className="font-semibold text-white">{activeMood.title}</span> mood
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {moodOptions.map((mood, index) => {
              const isActive = selectedMood === mood.value
              return (
                <motion.button
                  key={mood.value}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.35 }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMood(mood.value)}
                  className={`group relative flex min-h-[148px] flex-col items-start justify-between overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 md:min-h-[168px] md:p-5 ${
                    isActive
                      ? `border-transparent bg-gradient-to-br ${mood.gradient} ${mood.glow} ring-2 ${mood.ring}`
                      : 'border-olive-800/90 bg-olive-950/60 hover:border-olive-600 hover:bg-olive-900/80'
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-opacity duration-300 ${
                      mood.orb
                    } ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
                  />

                  <span
                    className={`relative text-3xl md:text-4xl transition-transform duration-300 ${
                      isActive ? 'scale-110' : 'group-hover:scale-105'
                    }`}
                  >
                    {mood.emoji}
                  </span>

                  <div className="relative mt-4 w-full">
                    <p className={`text-base font-bold md:text-lg ${isActive ? 'text-white' : 'text-olive-100'}`}>
                      {mood.title}
                    </p>
                    <p className={`mt-1 text-xs leading-snug md:text-sm ${isActive ? 'text-white/85' : 'text-olive-400'}`}>
                      {mood.tagline}
                    </p>
                  </div>

                  {isActive && (
                    <motion.span
                      layoutId="mood-active-pill"
                      className="absolute right-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                    >
                      Active
                    </motion.span>
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <div className="movie-row">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="movie-row-title mb-1">Top Picks for You</h2>
            <p className="text-sm text-olive-400">
              Tuned to your <span className="text-olive-200 font-medium">{activeMood.title.toLowerCase()}</span> mood
            </p>
          </div>
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
              <motion.div
                key={selectedMood}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 overflow-hidden rounded-2xl border border-olive-700/80 bg-olive-900/50 p-5 md:p-6`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${activeMood.gradient} text-lg`}>
                    {activeMood.emoji}
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-olive-400">AI mood read</p>
                    <p className="text-sm font-medium text-olive-200">Why these picks fit</p>
                  </div>
                </div>
                <p className="text-base leading-relaxed text-olive-100">{summary}</p>
              </motion.div>
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

