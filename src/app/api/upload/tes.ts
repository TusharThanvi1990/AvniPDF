import { NextRequest } from 'next/server';
import { IncomingMessage } from 'http';
import * as tesseract from 'tesseract.js';
import { Readable } from 'stream';
import { Socket } from 'net';

export async function nextRequestToNodeRequest(req: NextRequest): Promise<IncomingMessage> {
  const body = await req.blob();
  const readable = new Readable();
  readable._read = () => {};
  readable.push(Buffer.from(await body.arrayBuffer()));
  readable.push(null);

  const socket = new Socket();
  const incomingMessage = new IncomingMessage(socket);

  // Convert Headers to plain object
  const headers: { [key: string]: string } = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  incomingMessage.headers = headers;
  incomingMessage.method = req.method;
  incomingMessage.url = req.url;

  // Manually handle the data transfer from the readable stream to the incoming message
  readable.on('data', (chunk) => {
    incomingMessage.push(chunk);
  });

  readable.on('end', () => {
    incomingMessage.push(null);
  });

  return incomingMessage;
}

export async function extractTextFromImage(imagePath: string): Promise<string> {
  try {
    const { data: { text } } = await tesseract.recognize(imagePath, 'eng', {
      logger: m => console.log(m),
    });
    return text;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw error;
  }
}