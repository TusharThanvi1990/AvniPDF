import React, { useState } from 'react';
import mammoth from 'mammoth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { motion } from 'framer-motion';
import { useTheme } from '../Context/ThemeContext';
const WordToPdfConverter = () => {
  const { theme } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<Uint8Array | null>(null);
  const [error, setError] = useState('');
  const [previewText, setPreviewText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setPreviewText('');

      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        try {
          const { value } = await mammoth.extractRawText({ arrayBuffer });
          setPreviewText(value.slice(0, 500));
        } catch (err) {
          setPreviewText('Failed to preview document.');
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const convertWordToPdf = async () => {
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const htmlContent = result.value;

      const pdfDoc = await PDFDocument.create();
      const pages = [pdfDoc.addPage()];
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      let currentPage = pages[0];
      let yPosition = currentPage.getHeight() - 50;
      const margin = 50;
      const fontSize = 12;
      const lineHeight = fontSize * 1.2;
      const pageWidth = currentPage.getWidth();
      const maxWidth = pageWidth - 2 * margin;

      const addPage = () => {
        currentPage = pdfDoc.addPage();
        pages.push(currentPage);
        yPosition = currentPage.getHeight() - 50;
        return currentPage;
      };

      const processText = (text: string, indent: number = 0) => {
        const words = text.trim().split(/\s+/);
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = font.widthOfTextAtSize(testLine, fontSize);

          if (textWidth > maxWidth - indent) {
            if (yPosition - lineHeight < margin) {
              addPage();
            }

            currentPage.drawText(currentLine, {
              x: margin + indent,
              y: yPosition,
              size: fontSize,
              font,
            });

            yPosition -= lineHeight;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          if (yPosition - lineHeight < margin) {
            addPage();
          }

          currentPage.drawText(currentLine, {
            x: margin + indent,
            y: yPosition,
            size: fontSize,
            font,
          });

          yPosition -= lineHeight;
        }
      };

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      const processNode = (node: Node, indent: number = 0) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (text) {
            processText(text, indent);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          // Handle headers
          if (/^h[1-6]$/i.test(element.tagName)) {
            yPosition -= lineHeight;
            const headerSize = 20 - (parseInt(element.tagName[1]) * 2);
            processText(element.textContent || '', indent);
            yPosition -= lineHeight;
            return;
          }

          // Handle paragraphs
          if (element.tagName.toLowerCase() === 'p') {
            yPosition -= lineHeight / 2;
          }

          // Process child nodes
          for (const child of Array.from(node.childNodes)) {
            processNode(child, indent);
          }

          if (element.tagName.toLowerCase() === 'p') {
            yPosition -= lineHeight / 2;
          }
        }
      };

      processNode(tempDiv);
      const pdfBytes = await pdfDoc.save();
      setPdfFile(pdfBytes);
    } catch (error) {
      console.error('Conversion error:', error);
      setError('Error converting document. Please try again.');
    }
  };

  const downloadPdf = () => {
    if (pdfFile) {
      const blob = new Blob([pdfFile], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'converted.pdf';
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
            accept=".docx"
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
                  Choose Word file
                </span>
                <p 
                  className="text-sm mt-1"
                  style={{ color: 'var(--footer-muted)' }}
                >
                  {file ? file.name : 'DOCX up to 10MB'}
                </p>
              </div>
            </div>
          </label>
        </div>
        
        <motion.button
          onClick={convertWordToPdf}
          disabled={!file}
          className="w-full py-2 px-4 rounded-md transition-colors duration-200"
          style={{
            background: 'var(--hero-bg)',
            color: 'var(--hero-text)',
            opacity: file ? 1 : 0.5
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Convert to PDF
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

        {pdfFile && (
          <motion.button
            onClick={downloadPdf}
            className="w-full py-2 px-4 rounded-md"
            style={{
              background: 'var(--footer-link)',
              color: 'var(--hero-text)'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Download PDF
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default WordToPdfConverter;