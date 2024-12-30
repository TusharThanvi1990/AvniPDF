// import * as pdfjsLib from 'pdfjs-dist'
// import { useState, useRef, useEffect } from 'react'
// import { PDFDocument, rgb, StandardFonts } from 'pdf-lib' // Import pdf-lib
// import PDFRenderer from './PDFRenderer'
// import Button from './Button'

// export default function PDFEditor() {
//   const [pdfData, setPdfData] = useState<any[]>([])
//   const [jsonData, setJsonData] = useState<string>('')
//   const containerRef = useRef<HTMLDivElement>(null)
//   const [scale, setScale] = useState(1)
//   const originalPdfBytes = useRef<Uint8Array | null>(null) // Store original PDF data

//   useEffect(() => {
//     if (typeof window !== 'undefined') {
//       pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-workers/pdf.worker.min.js'
//     }
//   }, [])

//   const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0]
//     if (!file) return

//     const fileReader = new FileReader()
//     fileReader.onload = async () => {
//       const pdfData = new Uint8Array(fileReader.result as ArrayBuffer)
//       originalPdfBytes.current = pdfData // Save original PDF data for later

//       try {
//         const pdfDoc = await pdfjsLib.getDocument(pdfData).promise
//         const pdfContent: any[] = []

//         for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
//           const page = await pdfDoc.getPage(pageNumber)
//           const viewport = page.getViewport({ scale: 1 })
//           const textContent = await page.getTextContent()

//           const pageData = {
//             pageNumber,
//             width: viewport.width,
//             height: viewport.height,
//             elements: textContent.items.map((item: any) => ({
//               type: 'text',
//               content: item.str,
//               x: item.transform[4],
//               y: viewport.height - item.transform[5],
//               width: item.width,
//               height: item.height,
//               fontName: item.fontName,
//               fontSize: item.height,
//             })),
//           }

//           pdfContent.push(pageData)
//         }

//         setPdfData(pdfContent)
//         setJsonData(JSON.stringify(pdfContent, null, 2))
//       } catch (error) {
//         console.error('Error extracting PDF content:', error)
//       }
//     }

//     fileReader.readAsArrayBuffer(file)
//   }

//   const handleZoomIn = () => setScale((prevScale) => prevScale + 0.1)
//   const handleZoomOut = () => setScale((prevScale) => Math.max(0.1, prevScale - 0.1))

//   const handleContentChange = (pageIndex: number, elementIndex: number, newContent: string) => {
//     const newPdfData = [...pdfData]
//     newPdfData[pageIndex].elements[elementIndex].content = newContent
//     setPdfData(newPdfData)
//     setJsonData(JSON.stringify(newPdfData, null, 2))
//   }

//   const handleDownloadJSON = () => {
//     const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonData)
//     const downloadAnchorNode = document.createElement('a')
//     downloadAnchorNode.setAttribute('href', dataStr)
//     downloadAnchorNode.setAttribute('download', 'pdf_content.json')
//     document.body.appendChild(downloadAnchorNode)
//     downloadAnchorNode.click()
//     downloadAnchorNode.remove()
//   }

//   const handleDownloadPDF = async () => {
//     if (!originalPdfBytes.current) return
//     const pdfDoc = await PDFDocument.load(originalPdfBytes.current)

//     for (const page of pdfData) {
//       const pdfPage = pdfDoc.getPage(page.pageNumber - 1)

//       for (const element of page.elements) {
//         if (element.type === 'text') {
//           pdfPage.drawText(element.content, {
//             x: element.x,
//             y: element.y,
//             size: element.fontSize,
//             font: await pdfDoc.embedFont(StandardFonts.Helvetica),
//             color: rgb(0, 0, 0),
//           })
//         }
//       }
//     }

//     const pdfBytes = await pdfDoc.save()
//     const blob = new Blob([pdfBytes], { type: 'application/pdf' })
//     const downloadLink = document.createElement('a')
//     downloadLink.href = URL.createObjectURL(blob)
//     downloadLink.download = 'edited_pdf.pdf'
//     document.body.appendChild(downloadLink)
//     downloadLink.click()
//     downloadLink.remove()
//   }

//   return (
//     <div className="p-6 font-sans text-[var(--content-text)] bg-[var(--content-bg)] transition-colors duration-300 min-h-screen">
//       <h1 className="text-3xl font-bold mb-6 text-center">Editable PDF Viewer</h1>

//       <div className="flex flex-col items-center">
//         <label
//           htmlFor="file-upload"
//           className="mb-4 cursor-pointer bg-gradient-to-r from-green-500 to-teal-600 text-white px-5 py-2 rounded shadow hover:scale-105 transition-transform"
//         >
//           Upload PDF
//         </label>
//         <input
//           id="file-upload"
//           type="file"
//           onChange={handleUpload}
//           accept="application/pdf"
//           className="hidden"
//         />
//       </div>

//       <div className="flex justify-center mt-6">
//         <Button onClick={handleZoomIn} className="mr-4 px-3">
//           +
//         </Button>
//         <Button onClick={handleZoomOut} className="mr-4">
//           -
//         </Button>
//         <Button onClick={handleDownloadJSON} className="mr-4">
//           Download JSON
//         </Button>
//         <Button onClick={handleDownloadPDF} className="bg-red-500">
//           Download PDF
//         </Button>
//       </div>

//       <h2 className="text-xl font-semibold mt-8 mb-4">Rendered PDF Content</h2>
//       <div
//         ref={containerRef}
//         className="border border-gray-300 bg-[var(--card-bg)] text-[var(--card-text)] p-4 rounded-md shadow-md overflow-auto"
//       >
//         <PDFRenderer
//           jsonData={jsonData}
//           scale={scale}
//           handleContentChange={handleContentChange}
//         />
//       </div>
//     </div>
//   )
// }
