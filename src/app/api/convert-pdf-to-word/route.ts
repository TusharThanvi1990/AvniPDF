import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph } from 'docx';
// Use the Node-compatible legacy build of pdfjs-dist so it runs in Next.js API routes
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return new NextResponse('Method Not Allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded.' }, { status: 400 });
    }

    // Read the file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Process the PDF in Node environment (no worker). Use the legacy build and
    // explicit flags to avoid attempting to use browser workers or eval.
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(fileBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
    });
    const pdfDoc = await loadingTask.promise;

    let extractedText = '';
    const numPages = pdfDoc.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => {
        if ('str' in item) {
          return item.str;
        } else {
          return ''; // or some other default value
        }
      }).join(' ');
      extractedText += pageText + '\n';
    }

    // Create Word document using docx
    const paragraphs = extractedText.split('\n').map((line) => new Paragraph(line));
    const doc = new Document({
      sections: [{ children: paragraphs }],
    });

    const buffer = await Packer.toBuffer(doc);
    // Convert Node Buffer to Uint8Array for NextResponse body compatibility
    const outArray = new Uint8Array(buffer);

    return new NextResponse(outArray, {
      headers: {
        'Content-Disposition': 'attachment; filename=converted.docx',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json({ message: 'Error converting PDF to Word.' }, { status: 500 });
  }
}

