"use client";
import React, { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { motion } from "framer-motion";


const CompressPDF = () => {
  const [file, setFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<Blob | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<number>(50);
  const [originalFileSize, setOriginalFileSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files ? event.target.files[0] : null;
    if (uploadedFile) {
      setFile(uploadedFile);
      setOriginalFileSize(uploadedFile.size);
      setError(null);
    }
  };

  const handleCompress = async () => {
    if (!file) return;

    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();
        page.setSize(width * (compressionLevel / 100), height * (compressionLevel / 100));
      }

      const compressedBytes = await pdfDoc.save();
      const compressedBlob = new Blob([compressedBytes], { type: "application/pdf" });
      setCompressedFile(compressedBlob);
    } catch (error) {
      console.error("Compression error:", error);
      setError("Error compressing the PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!compressedFile) return;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(compressedFile);
    link.download = "compressed-file.pdf";
    link.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
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
                  {file ? file.name : 'PDF up to 10MB'}
                </p>
              </div>
            </div>
          </label>
        </div>

        {file && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--footer-link)' }}>
                Compression Level: {compressionLevel}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={compressionLevel}
                onChange={(e) => setCompressionLevel(Number(e.target.value))}
                className="w-full accent-[var(--footer-link)]"
              />
              <div className="flex justify-between text-sm mt-2" style={{ color: 'var(--footer-muted)' }}>
                <span>Maximum Compression</span>
                <span>Best Quality</span>
              </div>
            </div>

            <div className="text-sm space-y-1" style={{ color: 'var(--footer-muted)' }}>
              <p>Original Size: {formatFileSize(originalFileSize)}</p>
              {compressedFile && (
                <p>Compressed Size: {formatFileSize(compressedFile.size)} 
                  <span className="ml-2 text-green-500">
                    ({Math.round((1 - compressedFile.size / originalFileSize) * 100)}% smaller)
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-500 p-4 rounded-md bg-red-100 dark:bg-red-900/20">
            {error}
          </div>
        )}

        <motion.button
          onClick={handleCompress}
          disabled={!file || isLoading}
          className="w-full py-2 px-4 rounded-md transition-colors duration-200"
          style={{
            background: 'var(--hero-bg)',
            color: 'var(--hero-text)',
            opacity: file && !isLoading ? 1 : 0.5
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? "Compressing..." : "Compress PDF"}
        </motion.button>

        {compressedFile && (
          <motion.button
            onClick={handleDownload}
            className="w-full py-2 px-4 rounded-md"
            style={{
              background: 'var(--footer-link)',
              color: 'var(--hero-text)'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Download Compressed PDF
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default CompressPDF;