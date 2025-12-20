import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react'
import mammoth from 'mammoth'
import Papa from 'papaparse'

// Verwende Canvas-basierte PDF-Anzeige statt react-pdf
// um Worker-Probleme zu vermeiden

export default function DocumentViewer({ url, filename, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [content, setContent] = useState(null)
  const [fileType, setFileType] = useState(null)

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const ext = filename.toLowerCase().split('.').pop()
        setFileType(ext)

        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': '*/*',
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.statusText}`)
        }

        // PDF - Zeige als eingebettetes Objekt
        if (ext === 'pdf') {
          const blob = await response.blob()
          const blobUrl = URL.createObjectURL(blob)
          setContent(blobUrl)
        }
        // Word Dokumente (.doc, .docx)
        else if (ext === 'doc' || ext === 'docx') {
          const arrayBuffer = await response.arrayBuffer()
          const result = await mammoth.convertToHtml({ arrayBuffer })
          setContent(result.value)
        }
        // Excel (.xlsx, .xls)
        else if (ext === 'xlsx' || ext === 'xls') {
          const ExcelJS = await import('exceljs')
          const arrayBuffer = await response.arrayBuffer()
          const workbook = new ExcelJS.Workbook()
          await workbook.xlsx.load(arrayBuffer)
          
          // Konvertiere alle Sheets zu HTML
          const sheetsHtml = []
          workbook.eachSheet((worksheet, sheetId) => {
            let tableHtml = `<h2 style="color: #14b8a6; margin-top: 2rem; margin-bottom: 1rem; font-size: 1.5rem; font-weight: bold;">${worksheet.name}</h2>`
            tableHtml += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">'
            
            worksheet.eachRow((row, rowNumber) => {
              const isHeader = rowNumber === 1
              tableHtml += '<tr>'
              row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const cellValue = cell.value || ''
                const tag = isHeader ? 'th' : 'td'
                const style = isHeader 
                  ? 'border: 1px solid #ddd; padding: 8px; background: #f4f4f4; text-align: left; font-weight: bold;'
                  : 'border: 1px solid #ddd; padding: 8px;'
                tableHtml += `<${tag} style="${style}">${cellValue}</${tag}>`
              })
              tableHtml += '</tr>'
            })
            
            tableHtml += '</table>'
            sheetsHtml.push(tableHtml)
          })
          
          setContent(sheetsHtml.join(''))
        }
        // CSV
        else if (ext === 'csv') {
          const text = await response.text()
          Papa.parse(text, {
            complete: (results) => {
              // Erstelle HTML Tabelle aus CSV
              const table = `
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr>
                      ${results.data[0]?.map(cell => `<th style="border: 1px solid #ddd; padding: 8px; background: #f4f4f4; text-align: left;">${cell || ''}</th>`).join('') || ''}
                    </tr>
                  </thead>
                  <tbody>
                    ${results.data.slice(1).map(row => `
                      <tr>
                        ${row.map(cell => `<td style="border: 1px solid #ddd; padding: 8px;">${cell || ''}</td>`).join('')}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `
              setContent(table)
            },
            error: (error) => {
              throw new Error(`CSV parsing error: ${error.message}`)
            }
          })
        }
        // PowerPoint (.ppt, .pptx) - Anzeige als Hinweis
        else if (ext === 'ppt' || ext === 'pptx') {
          setContent(`
            <div style="text-align: center; padding: 4rem;">
              <div style="font-size: 4rem; margin-bottom: 1rem;">📊</div>
              <h2 style="color: #14b8a6; margin-bottom: 1rem;">PowerPoint Presentation</h2>
              <p style="color: #94a3b8; margin-bottom: 2rem;">PowerPoint files cannot be previewed directly in the browser.</p>
              <a href="${url}" download="${filename}" style="display: inline-block; padding: 0.75rem 1.5rem; background: #14b8a6; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: 600;">
                Download ${filename}
              </a>
            </div>
          `)
        }
        // Textdateien (.txt, .md, etc.)
        else {
          const text = await response.text()
          setContent(text)
        }
        
        setLoading(false)
      } catch (err) {
        console.error('Error loading document:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    if (url) {
      loadDocument()
    }

    return () => {
      if (content && fileType === 'pdf') {
        URL.revokeObjectURL(content)
      }
    }
  }, [url, filename])

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (!url) return null

  const isPDF = fileType === 'pdf'
  const isHTML = ['doc', 'docx', 'xlsx', 'xls', 'csv', 'ppt', 'pptx'].includes(fileType)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] m-4 bg-background-elevated rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-white">{filename}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Download"
            >
              <Download className="w-5 h-5 text-text-secondary" />
            </button>
            
            <div className="w-px h-6 bg-white/10 mx-2" />
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Document Viewer */}
        <div className="flex-1 overflow-auto bg-slate-900 flex items-center justify-center p-4">
          {loading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-teal mx-auto mb-4"></div>
              <p className="text-text-secondary">Loading document...</p>
            </div>
          )}

          {error && (
            <div className="text-center max-w-md px-6">
              <div className="text-red-400 text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Document</h3>
              <p className="text-text-secondary mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-brand-teal text-white rounded-lg hover:bg-brand-teal/80 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {!loading && !error && content && (
            <>
              {isPDF ? (
                <div className="w-full h-full flex flex-col">
                  <iframe
                    src={content}
                    className="w-full h-full rounded-lg"
                    title={filename}
                    style={{ minHeight: '600px' }}
                  />
                </div>
              ) : isHTML ? (
                <div className="w-full max-w-6xl bg-white rounded-lg p-8 shadow-xl overflow-auto max-h-full">
                  <div 
                    dangerouslySetInnerHTML={{ __html: content }}
                    style={{
                      color: '#1a1a1a',
                      lineHeight: '1.6'
                    }}
                  />
                </div>
              ) : (
                <div className="w-full max-w-4xl bg-white rounded-lg p-8 shadow-xl overflow-auto max-h-full">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-900">
                    {content}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}