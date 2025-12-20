export const formatModelSize = (bytes) => {
  const gb = bytes / (1024 ** 3)
  return `${gb.toFixed(1)} GB`
}

export const getSourceDomain = (url) => {
  try {
    const urlString = typeof url === 'string' ? url : url.url
    if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
      return new URL(urlString).hostname.replace('www.', '')
    }
    return 'File'
  } catch {
    return 'Source'
  }
}

export const getSourceUrl = (source) => {
  if (typeof source === 'string') {
    return source
  }
  
  return source.url || source.source || source
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


export const isFileUrl = (url) => {
  if (!url) return false
  const urlString = typeof url === 'string' ? url : url.url
  
  const isNotHttpUrl = !urlString.startsWith('http://') && !urlString.startsWith('https://')
  const hasFileExtension = /\.(pdf|doc|docx|txt|md|xlsx?|csv)$/i.test(urlString)
  
  return isNotHttpUrl && hasFileExtension
}

export const getFileName = (url) => {
  try {
    const urlString = typeof url === 'string' ? url : url.url
    const parts = urlString.split('/')
    return parts[parts.length - 1]
  } catch {
    return 'Unknown File'
  }
}

export const getFileIcon = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  
  switch(ext) {
    case 'pdf':
      return '📄'
    case 'doc':
    case 'docx':
      return '📝'
    case 'txt':
    case 'md':
      return '📋'
    case 'xls':
    case 'xlsx':
      return '📊'
    case 'csv':
      return '📈'
    default:
      return '📁'
  }
}