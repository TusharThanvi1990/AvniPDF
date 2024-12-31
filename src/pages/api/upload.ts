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
    destination: function (req, file, cb) {
      const uploadPath = path.join(process.cwd(), 'public/uploads');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  })
});

const uploadMiddleware = upload.single('file');

const handler: NextApiHandler = async (req, res) => {
  if (req.method === 'POST') {
    uploadMiddleware(req as any, res as any, async (err: any) => {
      if (err) {
        return res.status(500).json({ error: `Upload error: ${err.message}` });
      }

      const filePath = path.join(process.cwd(), 'public/uploads', (req as NextApiRequestWithFile).file.filename);
      try {
        const text = await tesseract.recognize(filePath, { lang: 'eng' });
        const fileUrl = `/uploads/${(req as NextApiRequestWithFile).file.filename}`;
        res.status(200).json({ text, fileUrl });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });
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