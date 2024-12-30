'use client'

import * as pdfjsLib from 'pdfjs-dist'
import { useState, useRef, useEffect } from 'react'
import PdfToWordConverter from '../../../components/PDFtoWord'
import { ThemeProvider } from '../../../Context/ThemeContext';

export default function Home() {


  return (
  <ThemeProvider>
    <PdfToWordConverter />
    </ThemeProvider>
  )
}
