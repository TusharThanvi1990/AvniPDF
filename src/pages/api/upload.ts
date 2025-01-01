import { NextResponse } from 'next/server';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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

// Helper function to handle file upload
const handleUpload = async (req: Request): Promise<{ filePath: string; fileUrl: string }> => {
  return new Promise((resolve, reject) => {
    const nextReq = req as unknown as Parameters<typeof upload.single>[0];
    const nextRes = {} as Parameters<typeof upload.single>[1];

    upload.single('file')(nextReq, nextRes, (err) => {
      if (err) {
        reject(err);
        return;
      }

      if (!nextReq.file) {
        reject(new Error('No file uploaded'));
        return;
      }

      const filePath = path.join(process.cwd(), 'public', 'uploads', nextReq.file.filename);
      const fileUrl = `/uploads/${nextReq.file.filename}`;
      resolve({ filePath, fileUrl });
    });
  });
};

export async function POST(req: Request) {
  try {
    const { filePath, fileUrl } = await handleUpload(req);
    return NextResponse.json({ success: true, filePath, fileUrl });
  } catch (error) {
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
