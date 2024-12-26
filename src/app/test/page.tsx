'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'

const PDFViewer = dynamic(() => import('../../../components/TextExtractor'), {
  ssr: false,
})

export default function Home() {
 

  return (
    <>hi</>
  )
}

