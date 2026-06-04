import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { FiArrowLeft } from 'react-icons/fi'
import ScoreBreakdownChart from '../../../components/ScoreBreakdownChart'
import FeatureImportanceBreakdown from '../../../components/FeatureImportanceBreakdown'
import { API_BASE } from '../../../lib/config'

export default function MovieExplainerPage() {
  const router = useRouter()
  const { id } = router.query
  const [movieData, setMovieData] = useState(null)
  const [breakdown, setBreakdown] = useState(null)
  const [comparedTo, setComparedTo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const description = movieData?.ai_plot || 'Description details are not available yet.'

  useEffect(() => {
    if (!id) return

    async function loadMovie() {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE}/movie/${id}`)

        if (!response.ok) {
          throw new Error('Movie explanation not available')
        }

        const data = await response.json()
        setMovieData(data)

        const topSimilar = data.recommendations?.[0]
        if (topSimilar?.title && data.title) {
          const breakdownRes = await fetch(`${API_BASE}/movie/score-breakdown`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source_title: data.title,
              target_title: topSimilar.title,
            }),
          })
          if (breakdownRes.ok) {
            const breakdownData = await breakdownRes.json()
            setComparedTo(topSimilar.title)
            setBreakdown({
              total_score: breakdownData.total_score,
              components: breakdownData.components,
              top_contributing_features: breakdownData.top_contributing_features,
            })
          }
        }
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setLoading(false)
      }
    }

    loadMovie()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-olive-950 flex items-center justify-center">
        <div className="text-center text-olive-300">Loading explanation...</div>
      </div>
    )
  }

  if (error || !movieData) {
    return (
      <div className="min-h-screen bg-olive-950 p-6 text-olive-50">
        <Link href="/recommend" className="flex items-center gap-2 text-olive-400 hover:text-olive-200 mb-6">
          <FiArrowLeft /> Back
        </Link>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
          <p className="text-red-300">{error || 'Movie not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-olive-950 text-olive-50 p-6">
      <Link href="/recommend" className="flex items-center gap-2 text-olive-400 hover:text-olive-200 mb-6">
        <FiArrowLeft /> Back to Recommendations
      </Link>

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{movieData.title}</h1>
          <p className="text-olive-300">
            {movieData.genres || 'Genre information unavailable'}
          </p>
          {comparedTo && (
            <p className="text-olive-400 text-sm mt-2">
              Score breakdown vs. top similar pick: <span className="text-olive-200">{comparedTo}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ScoreBreakdownChart scoreBreakdown={breakdown} />
          <FeatureImportanceBreakdown
            features={breakdown?.top_contributing_features || {}}
            title="Top Contributing Features"
          />
        </div>

        <div className="bg-olive-900/30 border border-olive-800 rounded-xl p-6">
          <h2 className="text-2xl font-semibold mb-3">Description</h2>
          <p className="text-olive-300 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}
