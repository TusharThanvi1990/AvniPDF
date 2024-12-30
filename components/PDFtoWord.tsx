import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../Context/ThemeContext';

const PdfToWordConverter = () => {
  const { theme } = useTheme();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [wordFile, setWordFile] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const [previewText, setPreviewText] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setPdfFile(selectedFile);
      setError('');
      setPreviewText('');
      setWordFile(null);

      // Preview logic (simplified for PDF)
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setPreviewText(text.slice(0, 500));
      };
      reader.readAsText(selectedFile);
    }
  };

  const convertPdfToWord = async () => {
    if (!pdfFile) return;

    setIsConverting(true);
    setError('');

    const formData = new FormData();
    formData.append('file', pdfFile);

    try {
      const response = await fetch('/api/convert-pdf-to-word', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Conversion failed!');

      const blob = await response.blob();
      setWordFile(blob);
    } catch (error) {
      console.error(error);
      setError('Error converting PDF to Word. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const downloadWord = () => {
    if (wordFile) {
      const url = URL.createObjectURL(wordFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'converted.docx';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="card p-6 max-w-2xl mx-auto my-8">
      <div className="space-y-6">
        <div className="relative">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="flex items-center justify-center w-full p-4 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-300 group hover:border-solid"
            style={{
              borderColor: 'var(--footer-link)',
              background: 'var(--card-bg)',
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <svg 
                className="w-8 h-8 transition-transform duration-300 group-hover:scale-110" 
                style={{ color: 'var(--footer-link)' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div className="text-center">
                <span 
                  className="font-medium"
                  style={{ color: 'var(--footer-link)' }}
                >
                  Choose PDF file
                </span>
                <p 
                  className="text-sm mt-1"
                  style={{ color: 'var(--footer-muted)' }}
                >
                  {pdfFile ? pdfFile.name : 'PDF up to 10MB'}
                </p>
              </div>
            </div>
          </label>
        </div>
        
        <motion.button
          onClick={convertPdfToWord}
          disabled={!pdfFile || isConverting}
          className="w-full py-2 px-4 rounded-md transition-colors duration-200"
          style={{
            background: 'var(--hero-bg)',
            color: 'var(--hero-text)',
            opacity: pdfFile && !isConverting ? 1 : 0.5
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isConverting ? 'Converting...' : 'Convert to Word'}
        </motion.button>

        {error && (
          <div className="text-red-500 p-4 rounded-md bg-red-100 dark:bg-red-900/20">
            {error}
          </div>
        )}

        {previewText && (
          <div className="card mt-4">
            <h3 className="text-lg font-semibold mb-2">Preview:</h3>
            <p className="text-sm">{previewText}...</p>
          </div>
        )}

        {wordFile && (
          <motion.button
            onClick={downloadWord}
            className="w-full py-2 px-4 rounded-md"
            style={{
              background: 'var(--footer-link)',
              color: 'var(--hero-text)'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Download Word Document
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default PdfToWordConverter;

