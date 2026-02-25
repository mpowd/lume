import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'
import mammoth from 'mammoth'
import Papa from 'papaparse'
import { customInstance } from '../../api/axios-instance'

const fetchAsBlob = (url) =>
  customInstance({ url, method: 'GET', responseType: 'blob' })

const fetchAsArrayBuffer = (url) =>
  customInstance({ url, method: 'GET', responseType: 'arraybuffer' })

const fetchAsText = (url) =>
  customInstance({ url, method: 'GET', responseType: 'text' })

const getFileExtension = (filename) =>
  filename.toLowerCase().split('.').pop()

const renderersMap = {
  pdf: async (url) => {
    const blob = await fetchAsBlob(url)
    return { type: 'pdf', content: URL.createObjectURL(blob) }
  },

  doc: async (url) => {
    const arrayBuffer = await fetchAsArrayBuffer(url)
    const { value } = await mammoth.convertToHtml({ arrayBuffer })
    return { type: 'html', content: value }
  },

  docx: async (url) => renderersMap.doc(url),

  xlsx: async (url) => {
    const ExcelJS = await import('exceljs')
    const arrayBuffer = await fetchAsArrayBuffer(url)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer)

    const sheetsHtml = []
    workbook.eachSheet((worksheet) => {
      let html = `<h2 style="color:#14b8a6;margin-top:2rem;margin-bottom:1rem;font-size:1.5rem;font-weight:bold">${worksheet.name}</h2>`
      html += '<table style="width:100%;border-collapse:collapse;margin-bottom:2rem">'
      worksheet.eachRow((row, rowNumber) => {
        const isHeader = rowNumber === 1
        html += '<tr>'
        row.eachCell({ includeEmpty: true }, (cell) => {
          const tag = isHeader ? 'th' : 'td'
          const style = isHeader
            ? 'border:1px solid #ddd;padding:8px;background:#f4f4f4;text-align:left;font-weight:bold'
            : 'border:1px solid #ddd;padding:8px'
          html += `<${tag} style="${style}">${cell.value ?? ''}</${tag}>`
        })
        html += '</tr>'
      })
      html += '</table>'
      sheetsHtml.push(html)
    })

    return { type: 'html', content: sheetsHtml.join('') }
  },

  xls: async (url) => renderersMap.xlsx(url),

  csv: async (url) => {
    const text = await fetchAsText(url)
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        complete: ({ data }) => {
          const [headers, ...rows] = data
          const html = `
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr>${headers.map((h) => `<th style="border:1px solid #ddd;padding:8px;background:#f4f4f4;text-align:left">${h}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${rows.map((row) => `<tr>${row.map((cell) => `<td style="border:1px solid #ddd;padding:8px">${cell}</td>`).join('')}</tr>`).join('')}
              </tbody>
            </table>`
          resolve({ type: 'html', content: html })
        },
        error: reject,
      })
    })
  },

  ppt: async (url, filename) => ({
    type: 'html',
    content: `
      <div style="text-align:center;padding:4rem">
        <div style="font-size:4rem;margin-bottom:1rem">📊</div>
        <h2 style="color:#14b8a6;margin-bottom:1rem">PowerPoint Presentation</h2>
        <p style="color:#94a3b8;margin-bottom:2rem">PowerPoint files cannot be previewed directly in the browser.</p>
        <a href="${url}" download="${filename}" style="display:inline-block;padding:0.75rem 1.5rem;background:#14b8a6;color:white;text-decoration:none;border-radius:0.5rem;font-weight:600">
          Download ${filename}
        </a>
      </div>`,
  }),

  pptx: async (url, filename) => renderersMap.ppt(url, filename),
}

export default function DocumentViewer({ url, filename, onClose }) {
  const [state, setState] = useState({ status: 'loading', type: null, content: null, error: null })

  useEffect(() => {
    if (!url) return

    let objectUrl = null

    const load = async () => {
      setState({ status: 'loading', type: null, content: null, error: null })
      try {
        const ext = getFileExtension(filename)
        const renderer = renderersMap[ext] ?? (async (u) => ({ type: 'text', content: await fetchAsText(u) }))
        const result = await renderer(url, filename)
        if (result.type === 'pdf') objectUrl = result.content
        setState({ status: 'success', ...result })
      } catch (err) {
        console.error('DocumentViewer: failed to load', err)
        setState({ status: 'error', type: null, content: null, error: err.message })
      }
    }

    load()

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] m-4 bg-background-elevated rounded-2xl shadow-2xl flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <span className="text-lg font-semibold text-white">{filename}</span>
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

        <div className="flex-1 overflow-auto bg-slate-900 flex items-center justify-center p-4">
          {state.status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-teal mx-auto mb-4" />
              <p className="text-text-secondary">Loading document...</p>
            </div>
          )}

          {state.status === 'error' && (
            <div className="text-center max-w-md px-6">
              <div className="text-red-400 text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Document</h3>
              <p className="text-text-secondary mb-4">{state.error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-brand-teal text-white rounded-lg hover:bg-brand-teal/80 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {state.status === 'success' && (
            <>
              {state.type === 'pdf' && (
                <iframe
                  src={state.content}
                  className="w-full h-full rounded-lg"
                  title={filename}
                  style={{ minHeight: '600px' }}
                />
              )}
              {state.type === 'html' && (
                <div className="w-full max-w-6xl bg-white rounded-lg p-8 shadow-xl overflow-auto max-h-full">
                  <div
                    dangerouslySetInnerHTML={{ __html: state.content }}
                    style={{ color: '#1a1a1a', lineHeight: '1.6' }}
                  />
                </div>
              )}
              {state.type === 'text' && (
                <div className="w-full max-w-4xl bg-white rounded-lg p-8 shadow-xl overflow-auto max-h-full">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-900">
                    {state.content}
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