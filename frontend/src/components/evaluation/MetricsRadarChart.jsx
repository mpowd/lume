import React, { useEffect, useRef } from 'react'

const MetricsRadarChart = ({ evaluations, assistants, metrics }) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || evaluations.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - 80

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw background circles
    const levels = 5
    for (let i = 1; i <= levels; i++) {
      const r = (radius / levels) * i
      ctx.beginPath()
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2)
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Draw axes and labels
    const angleStep = (Math.PI * 2) / metrics.length
    metrics.forEach((metric, index) => {
      const angle = angleStep * index - Math.PI / 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      // Draw axis line
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      ctx.strokeStyle = '#d1d5db'
      ctx.lineWidth = 1
      ctx.stroke()

      // Draw label
      const labelX = centerX + Math.cos(angle) * (radius + 40)
      const labelY = centerY + Math.sin(angle) * (radius + 40)
      ctx.fillStyle = '#374151'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(metric.label, labelX, labelY)
    })

    // Define colors for different assistants
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'
    ]

    // Draw polygons for each evaluation
    evaluations.forEach((evaluation, evalIndex) => {
      const color = colors[evalIndex % colors.length]
      const points = []

      metrics.forEach((metric, index) => {
        const angle = angleStep * index - Math.PI / 2
        const score = evaluation.metrics?.[metric.key] || 0
        const distance = (score * radius) // Score is 0-1, multiply by radius
        const x = centerX + Math.cos(angle) * distance
        const y = centerY + Math.sin(angle) * distance
        points.push({ x, y })
      })

      // Draw filled polygon
      ctx.beginPath()
      points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y)
        } else {
          ctx.lineTo(point.x, point.y)
        }
      })
      ctx.closePath()
      ctx.fillStyle = color + '20' // 20% opacity
      ctx.fill()

      // Draw polygon border
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw points
      points.forEach(point => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      })
    })

    // Draw level labels
    for (let i = 1; i <= levels; i++) {
      const value = (i / levels).toFixed(1)
      ctx.fillStyle = '#9ca3af'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(value, centerX - 5, centerY - (radius / levels) * i)
    }

  }, [evaluations, assistants, metrics])

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={500}
        className="mx-auto"
      />
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {evaluations.map((evaluation, index) => {
          const colors = [
            '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'
          ]
          const color = colors[index % colors.length]
          
          return (
            <div key={evaluation._id || index} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-medium text-gray-700">
                {assistants[evaluation.assistant_id] || 'Unknown'}
              </span>
              <span className="text-xs text-gray-500">
                ({evaluation.eval_llm_model})
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MetricsRadarChart