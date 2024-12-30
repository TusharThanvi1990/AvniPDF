"use client";
import React, { useEffect, useRef, useState } from 'react';
import type { WebViewerInstance } from '@pdftron/webviewer';
import WebViewer from '@pdftron/webviewer';



export default function PDFTronEditor() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<WebViewerInstance | null>(null);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initializeViewer = async () => {
      if (typeof window === 'undefined' || !viewerRef.current || viewerInstance.current) return;

      try {
        // Clear any existing content
        viewerRef.current.innerHTML = '';
        
        const instance = await WebViewer({
          path: '/lib',
          initialDoc: undefined,
          disabledElements: [
            'loadingModal',
            'errorModal',
            'printModal',
            'loadingBar',
          ],
          enableFilePicker: true,
          preloadWorker: 'pdf',
        //   showToolbarControl: false,
        }, viewerRef.current);

        viewerInstance.current = instance;
        //@ts-expect-error: Type inference issue with `instance.Core`
        const { UI, documentViewer, annotationManager } = instance.Core;

        // Wait for viewer to be ready
        await instance.Core.documentViewer.getViewerElement();
        setIsViewerReady(true);

        // Enable editing tools only after a document is loaded
        documentViewer.addEventListener('documentLoaded', () => {
          UI.setToolbarGroup('toolbarGroup-Annotate');
          setIsLoading(false);
        });

        // Set up file upload handler
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.addEventListener('change', async (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target?.files?.[0];
            if (!file) return;

            try {
              setIsLoading(true);

              const arrayBuffer = await file.arrayBuffer();
              await documentViewer.loadDocument(arrayBuffer, {
                extension: 'pdf',
                filename: file.name,
              });
            } catch (error) {
              console.error('Error loading document:', error);
              setIsLoading(false);
            }
          });
        }

        // Handle download
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
          downloadBtn.addEventListener('click', async () => {
            try {
              const doc = documentViewer.getDocument();
              if (!doc) return;

              setIsLoading(true);
              const xfdfString = await annotationManager.exportAnnotations();
              const data = await doc.getFileData({
                xfdfString,
                includeAnnotations: true,
              });

              const blob = new Blob([data], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);

              const link = document.createElement('a');
              link.href = url;
              link.download = 'edited.pdf';
              link.style.display = 'none';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              URL.revokeObjectURL(url);
              setIsLoading(false);
            } catch (error) {
              console.error('Error downloading PDF:', error);
              setIsLoading(false);
            }
          });
        }
      } catch (error) {
        console.error('Error initializing WebViewer:', error);
        setIsLoading(false);
      }
    };

    initializeViewer();

    return () => {
      if (viewerInstance.current) {
        try {
          viewerInstance.current.Core.documentViewer.closeDocument();
          viewerInstance.current = null;
        } catch (error) {
          console.error('Error cleaning up WebViewer:', error);
        }
      }
    };
  }, []);

  const LoadingSpinner = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen ${useTheme().theme}">
      <div className="p-6 bg-[var(--content-bg)] text-[var(--content-text)]">
        <h1 className="text-3xl font-bold mb-6 text-center">AVNI PDF
            Editor
        </h1>

        <div className="flex flex-col items-center mb-6">
          <label
            htmlFor="file-upload"
            className="cursor-pointer bg-gradient-to-r from-green-500 to-teal-600 text-white px-5 py-2 rounded shadow hover:scale-105 transition-transform"
          >
            Upload PDF
          </label>
          <input
            id="file-upload"
            type="file"
            accept="application/pdf"
            className="hidden"
          />
        </div>

        <div className="relative">
          <div 
            id="viewer" 
            ref={viewerRef} 
            className="w-full h-[calc(100vh-250px)] border border-gray-300 rounded shadow-md"
          />
          {(!isViewerReady || isLoading) && <LoadingSpinner />}
        </div>

        <div className="flex justify-center mt-6">
          <button
            id="download-btn"
            className="bg-blue-500 text-white px-5 py-2 rounded shadow hover:scale-105 transition-transform"
            disabled={isLoading}
          >
            Download Edited PDF
          </button>
        </div>
      </div>
    </div>
  );
}