import { NextResponse } from 'next/server';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { IncomingMessage, ServerResponse } from 'http';

// Define types for multer request
interface MulterRequest extends IncomingMessage {
  file?: Express.Multer.File;
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadPath = path.join(process.cwd(), 'public', 'uploads');
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
  }),
});

// Helper function to handle file upload with proper typing
const handleUpload = async (req: Request): Promise<{ filePath: string; fileUrl: string }> => {
  return new Promise((resolve, reject) => {
    // Create a mock IncomingMessage object without using `any`
    const multerReq = new IncomingMessage(req.socket); // Use the socket object instead of casting `any`
    multerReq.headers = req.headers;
    multerReq.method = req.method;

    // Create a minimal response object
    const multerRes = new ServerResponse(multerReq);
    multerRes.setHeader = () => {};
    multerRes.statusCode = 200;
    multerRes.send = () => {};
    multerRes.json = () => {};

    // Use multer to process the file
    upload.single('file')(multerReq, multerRes, (err: Error | null) => {
      if (err) {
        reject(err); // Reject the promise if an error occurs
        return;
      }

      if (!multerReq.file) {
        reject(new Error('No file uploaded'));
        return;
      }

      const filePath = path.join(process.cwd(), 'public', 'uploads', multerReq.file.filename);
      const fileUrl = `/uploads/${multerReq.file.filename}`;
      resolve({ filePath, fileUrl });
    });
  });
};

export async function POST(req: Request) {
  try {
    if (!req.body) {
      return NextResponse.json({ error: 'No request body' }, { status: 400 });
    }

    const { filePath, fileUrl } = await handleUpload(req);

    return NextResponse.json({
      success: true,
      filePath,
      fileUrl,
    });
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable body parsing to handle as a stream
  },
};
