import { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import tesseract from 'node-tesseract-ocr';
import path from 'path';
import fs from 'fs';

// Define custom types
type NextApiRequestWithFile = NextApiRequest & {
  file?: Express.Multer.File;
};

type MulterFile = Express.Multer.File;

// Configure multer
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

// Create a Promise-based middleware runner
const runMiddleware = (
  req: NextApiRequestWithFile,
  res: NextApiResponse,
  fn: (req: NextApiRequestWithFile, res: NextApiResponse, cb: (error: Error | null) => void) => void
): Promise<void> =>
  new Promise((resolve, reject) => {
    fn(req, res, (error: Error | null) => {
      if (error) reject(error);
      resolve();
    });
  });

// API route handler
export default async function handler(
  req: NextApiRequestWithFile,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method ?? 'Unknown'} Not Allowed` });
    return;
  }

  try {
    await runMiddleware(req, res, upload.single('file') as unknown as (
      req: NextApiRequestWithFile,
      res: NextApiResponse,
      cb: (error: Error | null) => void
    ) => void);

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', file.filename);
    const text = await tesseract.recognize(filePath, { lang: 'eng' });
    const fileUrl = `/uploads/${file.filename}`;

    res.status(200).json({ text, fileUrl });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
