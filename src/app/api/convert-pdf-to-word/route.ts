import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph } from 'docx';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
const pdfjsWorkerSrc = `../../../public/pdf-workers/pdf.worker.min.js`;
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

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

    // Process the PDF
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) });
    const pdfDoc = await loadingTask.promise;

    let extractedText = '';
    const numPages = pdfDoc.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      extractedText += pageText + '\n';
    }

    // Create Word document using docx
    const paragraphs = extractedText.split('\n').map((line) => new Paragraph(line));
    const doc = new Document({
      sections: [{ children: paragraphs }],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, {
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

