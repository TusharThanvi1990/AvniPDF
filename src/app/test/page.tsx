'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'

const PDFViewer = dynamic(() => import('../../../components/TextExtractor'), {
  ssr: false,
})

export default function Home() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPdfUrl(url)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">PDF Ebook Reader</h1>
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="mb-4"
      />
      {pdfUrl && <PDFViewer url={pdfUrl} />}
    </div>
  )
}

