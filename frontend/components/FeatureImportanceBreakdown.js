import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartColors, normalizeFeatureImportance } from '../lib/visualization-utils'

export default function FeatureImportanceBreakdown({ features, title = 'Feature Importance' }) {
  if (!features || Object.keys(features).length === 0) {
    return (
      <div className="bg-olive-900/30 border border-olive-700 rounded-lg p-6 text-center">
        <p className="text-olive-300">No feature importance data available</p>
      </div>
    )
  }

  const normalized = normalizeFeatureImportance(features).slice(0, 10)

  return (
    <div className="bg-olive-900/30 border border-olive-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-olive-100 mb-4">{title}</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={normalized}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.secondary} />
          <XAxis type="number" stroke={chartColors.accent} />
          <YAxis dataKey="name" type="category" width={95} stroke={chartColors.accent} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => value.toFixed(3)}
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: `1px solid ${chartColors.primary}`,
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="value" fill={chartColors.contentBg} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2 text-sm">
        {normalized.map((item, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-olive-300 truncate">{item.name}</span>
            <span className="text-olive-100 font-semibold ml-2">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
