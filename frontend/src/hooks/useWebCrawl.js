import { useState } from 'react'

export const useWebCrawl = () => {
  const [discoveredUrls, setDiscoveredUrls] = useState([])
  const [selectedUrls, setSelectedUrls] = useState({})
  const [crawling, setCrawling] = useState(false)
  const [error, setError] = useState(null)

  const crawl = async (baseUrl, includeExternal = false) => {
    setDiscoveredUrls([])
    setSelectedUrls({})
    setCrawling(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        base_url: baseUrl,
        include_external_domains: includeExternal.toString(),
      })

      const response = await fetch(`http://localhost:8000/website/links?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch links')
      }

      const links = await response.json()
      
      const transformedLinks = links.map(link => ({
        url: link.href || link.url,
        title: link.text || link.title || 'Untitled',
        score: link.total_score || link.score || 0,
        base_domain: link.base_domain || ''
      }))

      setDiscoveredUrls(transformedLinks)
      
      const initialSelection = transformedLinks.reduce((acc, link) => ({ 
        ...acc, 
        [link.url]: true 
      }), {})
      
      setSelectedUrls(initialSelection)
      
      return { success: true }
    } catch (err) {
      console.error('Error crawling:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setCrawling(false)
    }
  }

  const toggleUrlSelection = (url) => {
    setSelectedUrls(prev => ({
      ...prev,
      [url]: !prev[url]
    }))
  }

  const selectAll = (select) => {
    setSelectedUrls(
      discoveredUrls.reduce((acc, item) => ({ ...acc, [item.url]: select }), {})
    )
  }

  const getSelectedCount = () => {
    return Object.values(selectedUrls).filter(Boolean).length
  }

  const reset = () => {
    setDiscoveredUrls([])
    setSelectedUrls({})
    setCrawling(false)
    setError(null)
  }

  return {
    discoveredUrls,
    selectedUrls,
    crawling,
    error,
    crawl,
    toggleUrlSelection,
    selectAll,
    getSelectedCount,
    reset
  }
}