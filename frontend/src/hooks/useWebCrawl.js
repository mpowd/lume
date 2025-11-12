import { useState } from 'react'
import { websiteAPI } from '../services/api'

export const useWebCrawl = () => {
  const [discoveredUrls, setDiscoveredUrls] = useState([])
  const [selectedUrls, setSelectedUrls] = useState({})
  const [crawling, setCrawling] = useState(false)
  const [error, setError] = useState(null)

  const crawl = async (baseUrl, includeExternal = false, collectionName = null) => {
    setDiscoveredUrls([])
    setSelectedUrls({})
    setCrawling(true)
    setError(null)

    try {
      // Pass collectionName to check for existing URLs
      const links = await websiteAPI.getLinks(baseUrl, includeExternal, collectionName)
      
      const transformedLinks = links.map(link => ({
        url: link.href || link.url,
        title: link.text || link.title || 'Untitled',
        score: link.total_score || link.score || 0,
        base_domain: link.base_domain || '',
        exists_in_collection: link.exists_in_collection || false  // NEW FIELD
      }))

      setDiscoveredUrls(transformedLinks)
      
      // Only auto-select URLs that DON'T already exist in collection
      const initialSelection = transformedLinks.reduce((acc, link) => ({ 
        ...acc, 
        [link.url]: !link.exists_in_collection  // Only select if it doesn't exist
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
    // Only allow selecting URLs that don't exist in collection
    setSelectedUrls(
      discoveredUrls.reduce((acc, item) => ({ 
        ...acc, 
        [item.url]: item.exists_in_collection ? false : select 
      }), {})
    )
  }

  const getSelectedCount = () => {
    return Object.values(selectedUrls).filter(Boolean).length
  }

  const getNewUrlsCount = () => {
    return discoveredUrls.filter(url => !url.exists_in_collection).length
  }

  const getExistingUrlsCount = () => {
    return discoveredUrls.filter(url => url.exists_in_collection).length
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
    getNewUrlsCount,
    getExistingUrlsCount,
    reset
  }
}