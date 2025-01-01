import multer from 'multer';
import tesseract from 'node-tesseract-ocr';
import path from 'path';
import fs from 'fs';
import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';

interface NextApiRequestWithFile extends NextApiRequest {
  file: Express.Multer.File;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), 'public/uploads');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    },
  }),
});

const uploadMiddleware = upload.single('file');

const runMiddleware = (req: NextApiRequest, res: NextApiResponse, fn: Function) => {
  return new Promise<void>((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      resolve();
    });
  });
};

const handler: NextApiHandler = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await runMiddleware(req, res, uploadMiddleware);

      const filePath = path.join(process.cwd(), 'public/uploads', (req as NextApiRequestWithFile).file.filename);
      const text: string = await tesseract.recognize(filePath, { lang: 'eng' });
      const fileUrl = `/uploads/${(req as NextApiRequestWithFile).file.filename}`;
      res.status(200).json({ text, fileUrl });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  }
};

export default handler;

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};
