'use client'

import * as pdfjsLib from 'pdfjs-dist'
import { useState, useRef, useEffect } from 'react'
import PdfEditor from '../../../components/TextExtractor'
import Button from '../../../components/Button'
import PDFTronEditor from '../../../components/PDFEditor_PDFtron'
export default function Home() {


  return (
    <PDFTronEditor />
    //<PdfEditor />
  )
}
