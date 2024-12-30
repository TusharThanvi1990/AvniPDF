'use client';

import dynamic from 'next/dynamic';

// Dynamically import the PDFTronEditor component with SSR disabled
const ComingSoon = dynamic(() => import('../../../components/Comingsoon'), { 
  ssr: false 
});

export default function Home() {


  return (
    <ComingSoon />
  )
}
