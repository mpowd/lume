
export const formatModelSize = (bytes) => {
  const gb = bytes / (1024 ** 3)
  return `${gb.toFixed(1)} GB`
}

export const getSourceDomain = (url) => {
  try {
    const urlString = typeof url === 'string' ? url : url.url
    return new URL(urlString).hostname.replace('www.', '')
  } catch {
    return 'Source'
  }
}

export const getSourceUrl = (source) => {
  return typeof source === 'string' ? source : source.url
}

export const getSourceScore = (source) => {
  if (typeof source === 'string') return null
  return source.score !== undefined ? source.score : null
}

export const getSourceStyle = (score) => {
  if (score === null || score === undefined) {
    return {
      backgroundColor: 'rgb(30, 41, 59)',
      borderColor: 'rgba(148, 163, 184, 0.3)',
      border: '2px solid'
    }
  }
  
  const glowIntensity = score * 20
  const borderOpacity = 0.3 + (score * 0.4)
  
  return {
    backgroundColor: 'rgb(30, 41, 59)',
    borderColor: `rgba(59, 130, 246, ${borderOpacity})`,
    boxShadow: `0 0 ${glowIntensity}px rgba(59, 130, 246, ${score * 0.6}), inset 0 0 ${glowIntensity/2}px rgba(59, 130, 246, ${score * 0.2})`,
    border: '2px solid'
  }
}

export const getDotColor = (score) => {
  if (score === null || score === undefined) return 'bg-slate-400'
  
  if (score >= 0.8) return 'bg-emerald-400'
  if (score >= 0.6) return 'bg-blue-400'
  if (score >= 0.4) return 'bg-yellow-400'
  if (score >= 0.2) return 'bg-orange-400'
  return 'bg-red-400'
}