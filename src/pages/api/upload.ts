import { NextResponse } from 'next/server';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { IncomingMessage, ServerResponse } from 'http';

// Define types for multer request
type MulterRequest = IncomingMessage & {
  file?: Express.Multer.File;
};

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
    // Create a valid IncomingMessage object (mocked)
    const multerReq = Object.assign(new IncomingMessage({} as any), {
      headers: req.headers,
      method: req.method,
    }) as MulterRequest;

    // Create a minimal response object
    const multerRes = Object.assign(new ServerResponse(multerReq), {
      setHeader: () => {},
      status: () => {},
      send: () => {},
      json: () => {},
    });

    // Use multer to process the file
    upload.single('file')(multerReq, multerRes, (err: Error | null) => {
      if (err) {
        reject(err); // Reject the promise if error occurs
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
    bodyParser: false,
  },
};
