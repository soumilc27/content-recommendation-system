import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { chartColors } from '../lib/visualization-utils'

export default function ScoreBreakdownChart({ scoreBreakdown }) {
  if (!scoreBreakdown || !scoreBreakdown.components) {
    return (
      <div className="bg-olive-900/30 border border-olive-700 rounded-lg p-6 text-center">
        <p className="text-olive-300">No score breakdown available</p>
      </div>
    )
  }

  const data = scoreBreakdown.components.map((component) => ({
    name: component.component === 'content' ? 'Content-Based (60%)' : 'Collaborative (40%)',
    value: component.percentage,
    score: component.score.toFixed(3),
  }))

  const colors = [chartColors.contentBg, chartColors.collaborativeBg]

  return (
    <div className="bg-olive-900/30 border border-olive-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-olive-100 mb-4">Score Breakdown</h3>
      <p className="text-sm text-olive-300 mb-4">Total Score: {scoreBreakdown.total_score.toFixed(3)}</p>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => `${value.toFixed(1)}%`}
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: `1px solid ${chartColors.primary}`,
              borderRadius: '8px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2 text-sm">
        {scoreBreakdown.components.map((component, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-olive-300">
              {component.component === 'content' ? 'Content-Based' : 'Collaborative'}:
            </span>
            <span className="text-olive-100 font-semibold">
              {component.percentage.toFixed(1)}% ({component.score.toFixed(3)})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
