import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { PDFExtract } from 'pdf.js-extract';
import { Readable } from 'stream';
import * as pdfjsLib from 'pdfjs-dist';
import { Fields, Files, IncomingForm } from 'formidable';
import type { IncomingMessage } from 'http';

interface PDFContent {
  pageNumber: number;
  elements: PDFElement[];
  width: number;
  height: number;
}

interface PDFElement {
  type: 'text';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), 'tmp/uploads');

async function ensureUploadDir() {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
  }
}

async function nextRequestToNodeRequest(req: NextRequest): Promise<IncomingMessage> {
  const duplex = new Readable();
  const bodyText = await req.text();
  duplex.push(bodyText);
  duplex.push(null);

  return Object.assign(duplex, {
    headers: Object.fromEntries(req.headers),
    method: req.method,
    url: req.url,
  }) as unknown as IncomingMessage;
}

async function parseFormData(req: IncomingMessage): Promise<[Fields, Files]> {
  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB limit
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve([fields, files]);
    });
  });
}

if (typeof window === 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''; // Disable worker on server-side
} else {
  const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
}

async function extractPDFContent(filePath: string): Promise<PDFContent[]> {
  const pdfExtract = new PDFExtract();
  const options = {}; // You can add custom options here if needed
  
  try {
    const data = await pdfExtract.extract(filePath, options);
    
    return data.pages.map(page => ({
      pageNumber: page.pageInfo.num,
      width: page.pageInfo.width,
      height: page.pageInfo.height,
      elements: page.content.map(item => ({
        type: 'text',
        content: item.str,
        x: item.x, // X-coordinate
        y: item.y, // Y-coordinate
        width: item.width,
        height: item.height,
        fontName: item.fontName,
        fontSize: (item as any).fontSize || 0,
      })),
    }));
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    throw error;
  }
}

async function cleanupFile(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureUploadDir();
    const nodeReq = await nextRequestToNodeRequest(req);
    const [fields, files] = await parseFormData(nodeReq);

    const pdfFiles = files.pdf;
    const file = Array.isArray(pdfFiles) ? pdfFiles[0] : pdfFiles;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    if (!file.mimetype?.includes('pdf')) {
      await cleanupFile(file.filepath);
      return NextResponse.json({ error: 'Invalid file type. Please upload a PDF.' }, { status: 400 });
    }

    try {
      const pdfContent = await extractPDFContent(file.filepath);
      await cleanupFile(file.filepath);
      return NextResponse.json({ success: true, data: pdfContent });
    } catch (error) {
      console.error('Error processing PDF:', error);
      return NextResponse.json({ error: 'Error processing PDF file' }, { status: 500 });
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'PDF extraction API is running' });
}
