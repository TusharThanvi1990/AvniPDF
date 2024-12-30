'use client'

import * as pdfjsLib from 'pdfjs-dist'
import { useState, useRef, useEffect } from 'react'
import PdfEditor from '../../../components/TextExtractor'
import { ThemeProvider } from '../../../Context/ThemeContext'

export default function Home() {


  return (
  <ThemeProvider>
    <PdfEditor />
    </ThemeProvider>
  )
}
