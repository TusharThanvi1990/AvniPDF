// PDFEditor.tsx

'use client'

import * as pdfjsLib from 'pdfjs-dist'
import { useState, useRef, useEffect } from 'react'
import PDFRenderer from './PDFRenderer' // Import the new PDFRenderer component

export default function PDFEditor() {
  const [pdfData, setPdfData] = useState<any[]>([])
  const [jsonData, setJsonData] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-workers/pdf.worker.min.js'
    }
  }, [])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileReader = new FileReader()
    fileReader.onload = async () => {
      const pdfData = new Uint8Array(fileReader.result as ArrayBuffer)

      try {
        const pdfDoc = await pdfjsLib.getDocument(pdfData).promise
        const pdfContent: any[] = []

        for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
          const page = await pdfDoc.getPage(pageNumber)
          const viewport = page.getViewport({ scale: 1 })
          const textContent = await page.getTextContent()

          const pageData = {
            pageNumber,
            width: viewport.width,
            height: viewport.height,
            elements: textContent.items.map((item: any) => ({
              type: 'text',
              content: item.str,
              x: item.transform[4],
              y: viewport.height - item.transform[5],
              width: item.width,
              height: item.height,
              fontName: item.fontName,
              fontSize: item.height,
            }))
          }

          pdfContent.push(pageData)
        }

        setPdfData(pdfContent)
        setJsonData(JSON.stringify(pdfContent, null, 2))
      } catch (error) {
        console.error('Error extracting PDF content:', error)
      }
    }

    fileReader.readAsArrayBuffer(file)
  }

  const handleZoomIn = () => setScale(prevScale => prevScale + 0.1)
  const handleZoomOut = () => setScale(prevScale => Math.max(0.1, prevScale - 0.1))

  const handleContentChange = (pageIndex: number, elementIndex: number, newContent: string) => {
    const newPdfData = [...pdfData]
    newPdfData[pageIndex].elements[elementIndex].content = newContent
    setPdfData(newPdfData)
    setJsonData(JSON.stringify(newPdfData, null, 2))
  }

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonData)
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "pdf_content.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  return (
    <div className="p-4 font-sans">
      <h1 className="text-2xl font-bold mb-4">Editable PDF Viewer</h1>
      <input 
        type="file" 
        onChange={handleUpload} 
        accept="application/pdf" 
        className="mb-4 block w-full"
      />
      
      <div className="mb-4 space-x-2">
        <button onClick={handleZoomIn} className="px-3 py-1 bg-blue-500 text-white rounded">Zoom In</button>
        <button onClick={handleZoomOut} className="px-3 py-1 bg-blue-500 text-white rounded">Zoom Out</button>
        <button onClick={handleDownload} className="px-3 py-1 bg-green-500 text-white rounded">Download JSON</button>
      </div>

      <h2 className="text-xl font-semibold mb-2">Extracted JSON Data</h2>
      <pre className="bg-gray-100 p-4 rounded-md overflow-auto mb-4 text-sm">
        {jsonData}
      </pre>

      <h2 className="text-xl font-semibold mb-2">Rendered PDF Content</h2>
      <div
        ref={containerRef}
        className="border border-gray-300 bg-white p-4 rounded-md shadow-md overflow-auto"
      >
        <PDFRenderer
          jsonData={jsonData}
          scale={scale}
          handleContentChange={handleContentChange}
        />
      </div>
    </div>
  )
}
