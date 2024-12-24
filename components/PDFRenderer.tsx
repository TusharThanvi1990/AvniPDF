import React from 'react';

interface PDFRendererProps {
  jsonData: string;
  scale: number;
  handleContentChange: (pageIndex: number, elementIndex: number, newContent: string) => void;
}

const PDFRenderer: React.FC<PDFRendererProps> = ({ jsonData, scale, handleContentChange }) => {
  if (!jsonData) return null;

  let parsedData: any[] = [];
  try {
    parsedData = JSON.parse(jsonData);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {parsedData.map((page: any, pageIndex: number) => (
        <div
          key={pageIndex}
          style={{
            position: 'relative',
            width: `${page.width * scale}px`,
            height: `${page.height * scale}px`,
            border: '1px solid #ddd',
            marginBottom: '20px',
            backgroundColor: '#ffffff',
            overflow: 'hidden', // Ensure content doesn't spill outside
          }}
        >
          {page.elements.map((item: any, elementIndex: number) => (
            <div
              key={elementIndex}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) =>
                handleContentChange(pageIndex, elementIndex, e.currentTarget.textContent || '')
              }
              style={{
                position: 'absolute',
                left: `${item.x * scale}px`,
                top: `${item.y * scale}px`,
                width: `${item.width * scale}px`,
                height: `${item.height * scale}px`,
                fontSize: `${item.fontSize * scale}px`,
                fontFamily: item.fontName === 'g_d0_f1' ? 'Arial, sans-serif' : 'Times New Roman, serif',
                fontWeight: item.fontName === 'g_d0_f1' ? 'bold' : 'normal',
                lineHeight: `${item.height * scale}px`, // Align text properly in the box
                whiteSpace: 'pre-wrap', // Allow wrapping to prevent overflow
                overflow: 'hidden', // Clip overflowing content
                textAlign: 'center', // Center align text if needed
                backgroundColor: 'transparent',
                border: '1px solid transparent', // Highlight during editing
                zIndex: elementIndex, // Correct stacking order
                transition: 'border-color 0.3s',
                cursor: 'text',
              }}
            >
              {item.content}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default PDFRenderer;
