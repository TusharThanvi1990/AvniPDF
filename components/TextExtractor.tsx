// PDFEditor.tsx

'use client'

import * as pdfjsLib from 'pdfjs-dist'
import { useState, useRef, useEffect } from 'react'
import PDFRenderer from './PDFRenderer' // Import the new PDFRenderer component
import { PDFDocument, rgb } from 'pdf-lib'

interface PdfElement {
  type: 'text' | 'image';
  content?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName?: string;
  fontSize?: number;
  imageDataUrl?: string;
}

interface PdfPage {
  pageNumber: number;
  width: number;
  height: number;
  elements: PdfElement[];
}

export default function PDFEditor() {
  const [pdfData, setPdfData] = useState<PdfPage[]>([])
  const [jsonData, setJsonData] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 1 // Number of items per page

  const totalPages = Math.ceil(pdfData.length / itemsPerPage)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-workers/pdf.worker.min.js'
    }
  }, [])

  const handleNextPage = () => {
    setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages - 1))
  }

  const handlePrevPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 0))
  }

  const startIndex = currentPage * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = pdfData.slice(startIndex, endIndex)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileReader = new FileReader()
    fileReader.onload = async () => {
      const pdfData = new Uint8Array(fileReader.result as ArrayBuffer)

      try {
        const pdfDoc = await pdfjsLib.getDocument(pdfData).promise
        const pdfContent: PdfPage[] = []

        for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
          const page = await pdfDoc.getPage(pageNumber)
          const viewport = page.getViewport({ scale: 1 })
          const textContent = await page.getTextContent()
          const operatorList = await page.getOperatorList()

          const pageData: PdfPage = {
            pageNumber,
            width: viewport.width,
            height: viewport.height,
            elements: []
          }

          // Extract text elements
          textContent.items.forEach((item: any) => {
            pageData.elements.push({
              type: 'text',
              content: item.str,
              x: item.transform[4],
              y: viewport.height - item.transform[5],
              width: item.width,
              height: item.height,
              fontName: item.fontName,
              fontSize: item.height,
            })
          })

          // Extract image elements
          for (let i = 0; i < operatorList.fnArray.length; i++) {
            if (operatorList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
              const imgIndex = operatorList.argsArray[i][0]
              const img = await page.objs.get(imgIndex)
              const canvas = document.createElement('canvas')
              canvas.width = img.width
              canvas.height = img.height
              const ctx = canvas.getContext('2d')
              if (ctx) {
                const image = new Image()
                image.src = img.src
                image.onload = () => {
                  ctx.drawImage(image, 0, 0, img.width, img.height)
                  const imageDataUrl = canvas.toDataURL()
                  pageData.elements.push({
                    type: 'image',
                    x: 0, // You may need to adjust the x and y coordinates
                    y: 0, // You may need to adjust the x and y coordinates
                    width: img.width,
                    height: img.height,
                    imageDataUrl,
                  })
                }
              }
            }
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

  const handleDownloadPDF = async () => {
    const pdfDoc = await PDFDocument.create()
    for (const pageData of pdfData) {
      const page = pdfDoc.addPage([pageData.width, pageData.height])
      for (const element of pageData.elements) {
        if (element.type === 'text' && element.content) {
          page.drawText(element.content, {
            x: element.x,
            y: element.y,
            size: element.fontSize,
            font: await pdfDoc.embedFont(element.fontName || 'Helvetica'),
            color: rgb(0, 0, 0),
          })
        } else if (element.type === 'image' && element.imageDataUrl) {
          const img = await pdfDoc.embedPng(element.imageDataUrl)
          page.drawImage(img, {
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
          })
        }
      }
    }
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'downloaded.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="p-4 font-sans">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">AvniPDF</h1>
        <div className="space-x-2">
          <button className="px-3 py-1 bg-gray-500 text-white rounded">Home</button>
          <button className="px-3 py-1 bg-gray-500 text-white rounded">About</button>
          <button className="px-3 py-1 bg-gray-500 text-white rounded">Sign In</button>
        </div>
      </header>
      <div className="flex justify-center mb-4">
        <label htmlFor="file-upload" className="px-4 py-2 bg-red-500 text-white rounded cursor-pointer">
          SELECT PDF
        </label>
        <input
          id="file-upload"
          type="file"
          onChange={handleUpload}
          accept="application/pdf*" 
          className="hidden"
        />
      </div>
      
      <div className="flex justify-center mb-4 space-x-2">
        <button onClick={handleZoomIn} className="px-3 py-1 bg-blue-500 text-white rounded">Zoom In</button>
        <button onClick={handleZoomOut} className="px-3 py-1 bg-blue-500 text-white rounded">Zoom Out</button>
        <button onClick={handleDownload} className="px-3 py-1 bg-green-500 text-white rounded">Download JSON</button>
        <button onClick={handleDownloadPDF} className="px-3 py-1 bg-red-500 text-white rounded">Download PDF</button>
      </div>

      <h2 className="text-xl font-semibold mb-2 text-center">Rendered PDF Content</h2>
      <div className="flex justify-center mb-4 space-x-2">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 0}
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
        >
          Previous
        </button>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages - 1}
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
        >
          Next
        </button>
      </div>
      <div
        ref={containerRef}
        className="border border-gray-300 bg-white p-4 rounded-md shadow-md overflow-auto"
      >
        {currentItems.map((page, index) => (
          <PDFRenderer
            key={index}
            jsonData={JSON.stringify([page], null, 2)}
            scale={scale}
            handleContentChange={handleContentChange}
          />
        ))}
      </div>
    </div>
  )
}