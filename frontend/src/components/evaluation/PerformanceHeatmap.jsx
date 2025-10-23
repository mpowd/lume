import { useEffect, useRef } from 'react'
import Card from '../shared/Card'

export default function PerformanceHeatmap({ evaluations, assistants, metrics }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || evaluations.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Configuration
    const padding = 100
    const cellWidth = (width - padding * 2) / metrics.length
    const cellHeight = (height - padding * 2) / evaluations.length

    // Draw background
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, width, height)

    // Draw metric labels (top)
    ctx.fillStyle = '#94a3b8'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    metrics.forEach((metric, i) => {
      const x = padding + cellWidth * i + cellWidth / 2
      const y = padding - 20
      ctx.fillText(metric.label, x, y)
    })

    // Draw heatmap cells
    evaluations.forEach((evaluation, row) => {
      const assistant = assistants[evaluation.assistant_id]
      
      // Draw assistant label (left)
      ctx.fillStyle = '#ffffff'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'right'
      const assistantName = assistant?.name || 'Unknown'
      const truncatedName = assistantName.length > 15 ? assistantName.substring(0, 15) + '...' : assistantName
      ctx.fillText(truncatedName, padding - 10, padding + cellHeight * row + cellHeight / 2 + 5)

      metrics.forEach((metric, col) => {
        const score = evaluation.metrics?.[metric.key] || 0
        const x = padding + cellWidth * col
        const y = padding + cellHeight * row

        // Color based on score
        const getColor = (score) => {
          if (score >= 0.8) return { r: 16, g: 185, b: 129, a: score } // green
          if (score >= 0.6) return { r: 59, g: 130, b: 246, a: score } // blue
          if (score >= 0.4) return { r: 245, g: 158, b: 11, a: score } // orange
          return { r: 239, g: 68, b: 68, a: score } // red
        }

        const color = getColor(score)
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
        ctx.fillRect(x, y, cellWidth - 2, cellHeight - 2)

        // Draw border
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, cellWidth - 2, cellHeight - 2)

        // Draw score text
        ctx.fillStyle = score > 0.5 ? '#ffffff' : '#94a3b8'
        ctx.font = 'bold 16px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(
          (score * 100).toFixed(0) + '%',
          x + cellWidth / 2,
          y + cellHeight / 2 + 6
        )
      })
    })

    // Draw legend
    const legendY = height - 50
    const legendWidth = 200
    const legendHeight = 20
    const legendX = width - legendWidth - 50

    ctx.font = '12px sans-serif'
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'left'
    ctx.fillText('Performance:', legendX - 90, legendY + 15)

    // Gradient legend
    const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0)
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)') // red
    gradient.addColorStop(0.33, 'rgba(245, 158, 11, 0.8)') // orange
    gradient.addColorStop(0.66, 'rgba(59, 130, 246, 0.8)') // blue
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.8)') // green

    ctx.fillStyle = gradient
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight)

    // Legend labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('0%', legendX, legendY + legendHeight + 15)
    ctx.fillText('50%', legendX + legendWidth / 2, legendY + legendHeight + 15)
    ctx.fillText('100%', legendX + legendWidth, legendY + legendHeight + 15)

  }, [evaluations, assistants, metrics])

  return (
    <Card>
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-2">Performance Heatmap</h3>
          <p className="text-sm text-slate-400">
            Visualize all metrics for all assistants at a glance. Darker colors indicate better performance.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <canvas
            ref={canvasRef}
            width={900}
            height={Math.max(400, evaluations.length * 80 + 200)}
            className="mx-auto"
          />
        </div>

        {/* Legend explanation */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/80" />
            <span className="text-slate-400">Poor (0-40%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500/80" />
            <span className="text-slate-400">Fair (40-60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500/80" />
            <span className="text-slate-400">Good (60-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/80" />
            <span className="text-slate-400">Excellent (80-100%)</span>
          </div>
        </div>
      </div>
    </Card>
  )
}