import { useState, useEffect, useRef } from 'react'
import Card from '../shared/Card'
import FormSelect from '../shared/FormSelect'

export default function MetricScatterPlot({ evaluations, assistants, metrics }) {
  const [xMetric, setXMetric] = useState(metrics[0]?.key || 'answer_relevancy')
  const [yMetric, setYMetric] = useState(metrics[1]?.key || 'faithfulness')
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
    const padding = 80
    const plotWidth = width - padding * 2
    const plotHeight = height - padding * 2

    // Draw background
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, width, height)

    // Draw axes
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 2
    
    // X axis
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()
    
    // Y axis
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.stroke()

    // Draw grid lines
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const x = padding + (plotWidth / 5) * i
      const y = padding + (plotHeight / 5) * i
      
      // Vertical grid
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
      
      // Horizontal grid
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Labels
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    
    // X axis labels
    for (let i = 0; i <= 5; i++) {
      const x = padding + (plotWidth / 5) * i
      ctx.fillText((i * 0.2).toFixed(1), x, height - padding + 20)
    }
    
    // Y axis labels
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const y = height - padding - (plotHeight / 5) * i
      ctx.fillText((i * 0.2).toFixed(1), padding - 10, y + 5)
    }

    // Axis titles
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    
    const xMetricLabel = metrics.find(m => m.key === xMetric)?.label || xMetric
    const yMetricLabel = metrics.find(m => m.key === yMetric)?.label || yMetric
    
    ctx.fillText(xMetricLabel, width / 2, height - 30)
    
    ctx.save()
    ctx.translate(30, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(yMetricLabel, 0, 0)
    ctx.restore()

    // Plot points
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
    
    evaluations.forEach((evaluation, index) => {
      const xScore = evaluation.metrics?.[xMetric] || 0
      const yScore = evaluation.metrics?.[yMetric] || 0
      
      const x = padding + xScore * plotWidth
      const y = height - padding - yScore * plotHeight
      
      const color = colors[index % colors.length]
      
      // Draw point
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
      
      // Draw label
      const assistant = assistants[evaluation.assistant_id]
      const name = assistant?.name || 'Unknown'
      ctx.fillStyle = color
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(name, x + 12, y + 4)
    })

    // Draw diagonal reference line (perfect correlation)
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, padding)
    ctx.stroke()
    ctx.setLineDash([])

  }, [evaluations, assistants, metrics, xMetric, yMetric])

  return (
    <Card>
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-2">Metric Scatter Plot</h3>
          <p className="text-sm text-slate-400 mb-4">
            Compare two metrics to see correlations and patterns
          </p>

          {/* Metric Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label="X-Axis Metric"
              value={xMetric}
              onChange={(e) => setXMetric(e.target.value)}
              options={metrics.map(m => ({ value: m.key, label: m.label }))}
            />
            <FormSelect
              label="Y-Axis Metric"
              value={yMetric}
              onChange={(e) => setYMetric(e.target.value)}
              options={metrics.map(m => ({ value: m.key, label: m.label }))}
            />
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="mx-auto"
        />

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          {evaluations.map((evaluation, index) => {
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
            const color = colors[index % colors.length]
            const assistant = assistants[evaluation.assistant_id]
            
            return (
              <div key={evaluation._id} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-slate-300">{assistant?.name || 'Unknown'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}