import Link from 'next/link'
import { motion } from 'framer-motion'
import { FiStar, FiPlay, FiFilm } from 'react-icons/fi'

// Helper to format recommendation match score
function formatScore(value) {
  return Number.isFinite(value) ? value.toFixed(2) : 'N/A'
}

// Helper to format average ratings
function formatRating(value) {
  return Number.isFinite(value) ? value.toFixed(1) : null
}

// Hash-based premium gradient generator to design dynamic mock posters
function getPosterStyles(title) {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const schemes = [
    // Deep Indigo Midnight
    {
      gradient: 'from-slate-950 via-indigo-950 to-neutral-950',
      orb: 'bg-indigo-500/20',
      accent: 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10'
    },
    // Crimson Velvet
    {
      gradient: 'from-stone-950 via-rose-950 to-neutral-950',
      orb: 'bg-rose-500/20',
      accent: 'text-rose-300 border-rose-500/30 bg-rose-500/10'
    },
    // Forest Emerald
    {
      gradient: 'from-zinc-950 via-emerald-950 to-zinc-950',
      orb: 'bg-emerald-500/20',
      accent: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
    },
    // Golden Bronze
    {
      gradient: 'from-amber-950 via-stone-900 to-stone-950',
      orb: 'bg-amber-600/15',
      accent: 'text-amber-300 border-amber-600/20 bg-amber-600/5'
    },
    // Mystic Teal
    {
      gradient: 'from-slate-950 via-teal-950 to-neutral-950',
      orb: 'bg-teal-500/20',
      accent: 'text-teal-300 border-teal-500/30 bg-teal-500/10'
    },
    // Sunset Plum
    {
      gradient: 'from-stone-950 via-fuchsia-950 to-neutral-950',
      orb: 'bg-fuchsia-500/20',
      accent: 'text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/10'
    },
    // Ocean Midnight
    {
      gradient: 'from-slate-950 via-cyan-950 to-zinc-950',
      orb: 'bg-cyan-500/20',
      accent: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10'
    },
    // Orange Rust
    {
      gradient: 'from-stone-950 via-orange-950 to-neutral-950',
      orb: 'bg-orange-500/20',
      accent: 'text-orange-300 border-orange-500/30 bg-orange-500/10'
    },
    // Purple Haze
    {
      gradient: 'from-neutral-950 via-purple-950 to-stone-950',
      orb: 'bg-purple-500/20',
      accent: 'text-purple-300 border-purple-500/30 bg-purple-500/10'
    },
    // Velvet Red
    {
      gradient: 'from-slate-950 via-red-950 to-zinc-950',
      orb: 'bg-red-500/15',
      accent: 'text-red-300 border-red-500/30 bg-red-500/10'
    }
  ]
  
  const index = Math.abs(hash) % schemes.length
  return schemes[index]
}

const renderGenres = (genres) => {
  if (!genres) return <span className="text-olive-300">No genres</span>;
  const raw = String(genres).trim();
  const parts = raw.includes('|') ? raw.split('|') : raw.split(/\s+/);
  return parts
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((g, i) => (
      <span
        key={i}
        className="text-[9px] tracking-wide text-olive-300 bg-olive-950/50 px-2 py-0.5 rounded-full border border-olive-800/40 capitalize font-medium"
      >
        {g.toLowerCase()}
      </span>
    ));
};

export default function MovieCard({ movie, variant = 'grid' }) {
  if (!movie) return null

  // Extract year from title if embedded inside parentheses, e.g. "Toy Story (1995)"
  const titleMatch = movie.title ? movie.title.match(/^(.*?)\s*\((\d{4})\)\s*$/) : null
  const cleanTitle = titleMatch ? titleMatch[1].trim() : (movie.title || 'Untitled Movie')
  const movieYear = titleMatch ? titleMatch[2] : (movie.year || null)
  
  const poster = getPosterStyles(cleanTitle)

  // ==========================================
  // LIST VARIANT
  // ==========================================
  if (variant === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -3, scale: 1.01 }}
        transition={{ duration: 0.3 }}
        className="glass-card bg-gradient-to-r from-olive-950/50 via-olive-900/30 to-olive-950/50 backdrop-blur-md rounded-2xl p-4 mb-3 border border-white/5 hover:border-olive-400/20 shadow-lg hover:shadow-xl transition-all duration-300 group"
      >
        <div className="flex gap-4 items-center">
          {/* Stylized Thumbnail Poster */}
          <div className={`w-16 h-24 rounded-xl flex-shrink-0 relative overflow-hidden bg-gradient-to-br ${poster.gradient} border border-white/10 shadow-inner flex flex-col justify-between p-2 group-hover:border-olive-400/30 transition-colors duration-300`}>
            <div className={`absolute w-12 h-12 rounded-full ${poster.orb} filter blur-lg top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`} />
            <span className="text-white/[0.03] absolute top-1 left-2 text-4xl font-extrabold select-none uppercase pointer-events-none">{cleanTitle.charAt(0)}</span>
            <div className="w-full flex justify-center py-2 z-10">
              <FiFilm className="text-white/40 group-hover:text-white/70 transition-colors duration-300" size={18} />
            </div>
            <span className="text-[7px] text-white/50 font-bold uppercase tracking-wider text-center line-clamp-2 px-0.5 z-10">{cleanTitle}</span>
          </div>

          {/* Details Column */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="font-bold text-white text-base md:text-lg truncate group-hover:text-olive-300 transition-colors duration-300">
                  {(movie.movie_id || movie.id) ? (
                    <Link href={`/movie/${movie.movie_id || movie.id}`}>{cleanTitle}</Link>
                  ) : (
                    cleanTitle
                  )}
                </h3>
                {movieYear && (
                  <span className="text-[10px] tracking-wide text-white/40 border border-white/10 px-1.5 py-0.2 rounded font-mono font-medium">
                    {movieYear}
                  </span>
                )}
              </div>

              {/* Genre Pills */}
              {movie.genres && renderGenres(movie.genres)}

              {/* Explanation Text */}
              {movie.explanation && (
                <p className="text-olive-200/90 text-xs mt-2 line-clamp-2 leading-relaxed font-light">
                  {movie.explanation}
                </p>
              )}
            </div>

            {/* Footer row with Match Score & Ratings */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {Number.isFinite(movie.score) && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{movie.score <= 1.0 ? `${Math.round(movie.score * 100)}% Match` : `Score: ${movie.score.toFixed(2)}`}</span>
                </div>
              )}
              {Number.isFinite(movie.avg_rating) && (
                <div className="flex items-center gap-1.5 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-medium">
                  <FiStar size={11} className="text-amber-400" fill="currentColor" />
                  <span>{formatRating(movie.avg_rating)} / 5</span>
                  {movie.rating_count && (
                    <span className="text-white/40 text-[10px] ml-0.5 font-normal">({movie.rating_count})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // ==========================================
  // GRID VARIANT
  // ==========================================
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="movie-card glass-card group"
    >
      {/* High-Fidelity Custom Animated Poster Canvas */}
      <div className={`w-full h-full relative overflow-hidden bg-gradient-to-br ${poster.gradient} flex flex-col justify-between p-4 z-0`}>
        {/* Ambient Gradient Lighting Orbs */}
        <div className={`absolute top-1/4 left-1/3 w-32 h-32 rounded-full ${poster.orb} filter blur-2xl z-0 transform -translate-x-1/2 -translate-y-1/2`} />
        <div className={`absolute bottom-1/4 right-1/3 w-28 h-28 rounded-full ${poster.orb} filter blur-2xl z-0 opacity-70`} />
        
        {/* Subtle grid pattern for vintage film poster texture */}
        <div className="grain-overlay absolute inset-0 opacity-[0.14] z-0 pointer-events-none" />
        
        {/* Elegant Letter Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <span className="text-white/[0.03] text-[9.5rem] font-black font-sans uppercase select-none">
            {cleanTitle.charAt(0)}
          </span>
        </div>

        {/* Top Badges Area */}
        <div className="flex justify-between items-start z-10 w-full">
          {Number.isFinite(movie.score) ? (
            <div className="glass-badge font-mono backdrop-blur-md bg-black/60 border border-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white/90 flex items-center gap-1.5 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {movie.score <= 1.0 ? `${Math.round(movie.score * 100)}% Match` : `Score: ${movie.score.toFixed(1)}`}
            </div>
          ) : (
            <div />
          )}

          {movieYear && (
            <span className="backdrop-blur-md bg-black/50 border border-white/15 px-2 py-0.5 rounded text-[10px] font-mono text-white/60 font-semibold tracking-wider shadow-md">
              {movieYear}
            </span>
          )}
        </div>

        {/* Poster Center Art */}
        <div className="flex flex-col items-center justify-center flex-1 py-8 z-10 opacity-75 group-hover:opacity-95 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 group-hover:border-white/20 transition-all duration-500">
            <FiFilm size={20} className="text-white/60 group-hover:text-white/80 transition-colors" />
          </div>
      <span className="text-[9px] tracking-[0.25em] text-white/40 uppercase font-bold text-center px-2">
            CineMind Selection
          </span>
        </div>

        {/* Poster Footer Genres (Muted) */}
        {movie.genres && renderGenres(movie.genres)}
      </div>

      {/* Glassmorphic Sliding Interactive Overlay */}
      <div className="movie-card-overlay">
        <div className="movie-card-info w-full">
          {/* Title & Link */}
          <h3 className="movie-card-title text-base font-bold text-white leading-tight">
            {(movie.movie_id || movie.id) ? (
              <Link href={`/movie/${movie.movie_id || movie.id}`} className="hover:text-olive-300 transition-colors duration-300">
                {cleanTitle}
              </Link>
            ) : (
              cleanTitle
            )}
          </h3>

          {/* Average Rating Rating */}
          {Number.isFinite(movie.avg_rating) && (
            <div className="movie-card-rating mb-2">
              <FiStar size={11} className="text-amber-400" fill="currentColor" />
              <span className="font-semibold text-white/90">{formatRating(movie.avg_rating)}</span>
              <span className="text-white/50">/5</span>
              {movie.rating_count && (
                <span className="text-white/40 text-[10px] ml-1 font-normal">({movie.rating_count} ratings)</span>
              )}
            </div>
          )}

          {/* Hover Details Row: Genre Pills, Explanation, and CTA Button */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 mt-2">
            {/* Genre micro pills */}
                {movie.genres && renderGenres(movie.genres)}

            {/* Movie explanation / description with 3-line clamp */}
            {(movie.explanation || movie.description) && (
              <p className="text-[11px] text-white/80 mb-3.5 line-clamp-3 leading-relaxed font-light">
                {movie.explanation || movie.description}
              </p>
            )}

            {/* Primary Action Button */}
            {(movie.movie_id || movie.id) && (
              <Link href={`/movie/${movie.movie_id || movie.id}`} className="block w-full">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-center gap-1.5 bg-olive-600 hover:bg-olive-500 border border-olive-500/20 text-white py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all duration-300"
                >
                  <FiPlay size={11} fill="currentColor" />
                  <span>View Details</span>
                </motion.button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
