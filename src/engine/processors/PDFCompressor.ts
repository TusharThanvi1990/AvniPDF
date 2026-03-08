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
            const factor = level / 100;

            const arrayBuffer = await doc.blob.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);

            // 1. Metadata Stripping
            pdfDoc.setTitle('');
            pdfDoc.setAuthor('');
            pdfDoc.setSubject('');
            pdfDoc.setKeywords([]);
            pdfDoc.setCreator('');
            pdfDoc.setProducer('');

            // 2. Image Optimization (The most effective Adobe-level technique)
            // We iterate through all objects in the PDF to find images
            const indirectObjects = pdfDoc.context.enumerateIndirectObjects();

            for (const [ref, obj] of indirectObjects) {
                if (!(obj instanceof (await import('pdf-lib')).PDFRawStream)) continue;

                const dict = obj.dict;
                const subtype = dict.get((await import('pdf-lib')).PDFName.of('Subtype'));

                if (subtype === (await import('pdf-lib')).PDFName.of('Image')) {
                    // This is an image! Let's optimize it.
                    try {
                        const width = (dict.get((await import('pdf-lib')).PDFName.of('Width')) as any)?.value;
                        const height = (dict.get((await import('pdf-lib')).PDFName.of('Height')) as any)?.value;

                        // Only downsample if it's a reasonably large image
                        if (width > 500 || height > 500) {
                            const originalData = obj.contents;

                            // Helper to compress image in browser
                            const compressedData = await this.compressImageInBrowser(originalData, width, height, factor);

                            if (compressedData && compressedData.length < originalData.length) {
                                // Update the stream with compressed data
                                (obj as any).contents = compressedData;
                                dict.set((await import('pdf-lib')).PDFName.of('Length'), (await import('pdf-lib')).PDFNumber.of(compressedData.length));
                                // Ensure it's treated as JPEG (DCTDecode)
                                dict.set((await import('pdf-lib')).PDFName.of('Filter'), (await import('pdf-lib')).PDFName.of('DCTDecode'));
                            }
                        }
                    } catch (e) {
                        console.warn('Could not optimize image object:', ref, e);
                    }
                }
            }

            // 3. Structural Scaling (for extreme cases)
            if (factor < 0.7) {
                const pages = pdfDoc.getPages();
                for (const page of pages) {
                    page.scale(factor, factor);
                }
            }

            // 4. Object Stream Optimization
            const compressedBytes = await pdfDoc.save({
                useObjectStreams: true,
            });

            const compressedBlob = new Blob([compressedBytes as any], { type: 'application/pdf' });

            return {
                success: true,
                document: { ...doc, blob: compressedBlob, size: compressedBlob.size, history: [...doc.history, { taskId: crypto.randomUUID(), processorName: this.name, timestamp: Date.now(), params }] },
                metrics: { duration: 0, originalSize: doc.size, newSize: compressedBlob.size }
            };

        } catch (error: any) {
            console.error('Adobe-Level Compression error:', error);
            return { success: false, document: doc, error: error.message };
        }
    }

    // Internal helper to compress images using Browser Canvas API
    private async compressImageInBrowser(data: Uint8Array, width: number, height: number, factor: number): Promise<Uint8Array | null> {
        return new Promise((resolve) => {
            try {
                const blob = new Blob([data as any]);
                const url = URL.createObjectURL(blob);
                const img = new Image();

                img.onload = () => {
                    URL.revokeObjectURL(url);
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    if (!ctx) return resolve(null);

                    // Downsample dimensions
                    canvas.width = Math.floor(width * factor);
                    canvas.height = Math.floor(height * factor);

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Export as JPEG with quality based on factor
                    canvas.toBlob((resultBlob) => {
                        if (!resultBlob) return resolve(null);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            resolve(new Uint8Array(reader.result as ArrayBuffer));
                        };
                        reader.readAsArrayBuffer(resultBlob);
                    }, 'image/jpeg', Math.max(0.1, factor));
                };

                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    resolve(null);
                };

                img.src = url;
            } catch (e) {
                resolve(null);
            }
        });
    }
}
