'use client'

import * as pdfjsLib from 'pdfjs-dist'
import { useState, useRef, useEffect } from 'react'
import WordToPdfConverter from '../../../components/wordtopdf'

export default function Home() {


  return (
    <WordToPdfConverter />
  )
}
