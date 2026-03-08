import { PDFDocument } from 'pdf-lib';
import {
    IAvniProcessor,
    AvniDocument,
    ProcessorResult,
    ProcessingStep
} from '../types';

export class PDFCompressor implements IAvniProcessor {
    name = 'pdf-compressor';
    supportedTypes = ['pdf' as const];

    async process(doc: AvniDocument, params: { level: number }): Promise<ProcessorResult> {
        try {
            const { level } = params; // level is 0-100

            // Load the PDF from the blob
            const arrayBuffer = await doc.blob.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);

            const pages = pdfDoc.getPages();

            // Migration of your existing logic:
            // Resizing pages based on compression level
            for (const page of pages) {
                const { width, height } = page.getSize();
                const factor = level / 100;
                page.setSize(width * factor, height * factor);
            }

            const compressedBytes = await pdfDoc.save();
            const compressedBlob = new Blob([compressedBytes as any], { type: 'application/pdf' });

            const step: ProcessingStep = {
                taskId: crypto.randomUUID(),
                processorName: this.name,
                timestamp: Date.now(),
                params
            };

            const newDoc: AvniDocument = {
                ...doc,
                blob: compressedBlob,
                size: compressedBlob.size,
                history: [...doc.history, step]
            };

            return {
                success: true,
                document: newDoc
            };

        } catch (error: any) {
            return {
                success: false,
                document: doc,
                error: error.message || 'Error during PDF compression'
            };
        }
    }
}
