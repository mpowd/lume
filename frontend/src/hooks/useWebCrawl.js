import { useState } from 'react'
import { getWebsiteLinks } from '../api/generated'

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
      const params = {
        base_url: baseUrl,
        include_external: includeExternal,
      }
      if (collectionName) {
        params.collection_name = collectionName
      }

      const links = await getWebsiteLinks(params)

      const transformedLinks = links.map((link) => ({
        url: link.href || link.url,
        title: link.text || link.title || 'Untitled',
        score: link.score || 0,
        base_domain: link.base_domain || '',
        exists_in_collection: link.exists_in_collection || false,
      }))

      setDiscoveredUrls(transformedLinks)

      // Auto-select only new URLs
      const initialSelection = transformedLinks.reduce(
        (acc, link) => ({
          ...acc,
          [link.url]: !link.exists_in_collection,
        }),
        {}
      )

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
    setSelectedUrls((prev) => ({ ...prev, [url]: !prev[url] }))
  }

  const selectAll = (select) => {
    setSelectedUrls(
      discoveredUrls.reduce(
        (acc, item) => ({
          ...acc,
          [item.url]: item.exists_in_collection ? false : select,
        }),
        {}
      )
    )
  }

  const getSelectedCount = () => Object.values(selectedUrls).filter(Boolean).length
  const getNewUrlsCount = () => discoveredUrls.filter((u) => !u.exists_in_collection).length
  const getExistingUrlsCount = () => discoveredUrls.filter((u) => u.exists_in_collection).length

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
    reset,
  }
}
