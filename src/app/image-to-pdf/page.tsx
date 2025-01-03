'use client';

import dynamic from 'next/dynamic';

// Dynamically import the ImageToText component with client-side rendering
const ImageToText = dynamic(() => import('../../../components/ImageToText'), { 
  ssr: false 
});

export default function Home() {
  return (
    <ImageToText />
  );
}
