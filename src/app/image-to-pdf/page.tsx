'use client';

import dynamic from 'next/dynamic';
import ImageToText from '../../../components/ImageToText';

// Dynamically import the PDFTronEditor component with SSR disabled
const ComingSoon = dynamic(() => import('../../../components/Comingsoon'), { 
  ssr: false 
});

export default function Home() {

  return (
    <ImageToText />
    // <ComingSoon />
  )
}