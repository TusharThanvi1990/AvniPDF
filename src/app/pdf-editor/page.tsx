'use client';

import dynamic from 'next/dynamic';

// Dynamically import the PDFTronEditor component with SSR disabled
const PDFTronEditor = dynamic(() => import('../../../components/PDFEditor_PDFtron'), { 
  ssr: false 
});

export default function Home() {
  return <PDFTronEditor />;
}
