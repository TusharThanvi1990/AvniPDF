'use client'

import PdfToWordConverter from '../../../components/PDFtoWord'
import { ThemeProvider } from '../../../Context/ThemeContext';

export default function Home() {


  return (
  <ThemeProvider>
    <PdfToWordConverter />
    </ThemeProvider>
  )
}
