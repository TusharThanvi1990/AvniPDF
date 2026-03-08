import { PDFDocument, PDFRawStream, PDFName, PDFNumber } from 'pdf-lib';
import {
    IAvniProcessor,
    AvniDocument,
    ProcessorResult,
    ProcessingStep
} from '../types';

export class PDFCompressor implements IAvniProcessor {
    name = 'pdf-compressor';
    supportedTypes = ['pdf' as const];

    async process(doc: AvniDocument, params: Record<string, unknown>): Promise<ProcessorResult> {
        try {
            const level = (params.level as number) || 50;
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

            // 2. Image Optimization
            const indirectObjects = pdfDoc.context.enumerateIndirectObjects();

            for (const [, obj] of indirectObjects) {
                if (!(obj instanceof PDFRawStream)) continue;

                const dict = obj.dict;
                const subtype = dict.get(PDFName.of('Subtype'));

                if (subtype === PDFName.of('Image')) {
                    try {
                        const widthObj = dict.get(PDFName.of('Width'));
                        const heightObj = dict.get(PDFName.of('Height'));

                        const width = widthObj instanceof PDFNumber ? widthObj.asNumber() : 0;
                        const height = heightObj instanceof PDFNumber ? heightObj.asNumber() : 0;

                        if (width > 500 || height > 500) {
                            const originalData = obj.contents;
                            const compressedData = await this.compressImageInBrowser(originalData, width, height, factor);

                            if (compressedData && compressedData.length < originalData.length) {
                                // @ts-expect-error - contents is read-only in types but we need to modify it for compression
                                obj.contents = compressedData;
                                dict.set(PDFName.of('Length'), PDFNumber.of(compressedData.length));
                                dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
                            }
                        }
                    } catch {
                        // Silent skip for individual image errors
                    }
                }
            }

            // 3. Structural Scaling
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

            // @ts-expect-error - Uint8Array is compatible with BlobPart at runtime
            const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });

            const step: ProcessingStep = {
                taskId: crypto.randomUUID(),
                processorName: this.name,
                timestamp: Date.now(),
                params
            };

            return {
                success: true,
                document: {
                    ...doc,
                    blob: compressedBlob,
                    size: compressedBlob.size,
                    history: [...doc.history, step]
                },
                metrics: { duration: 0, originalSize: doc.size, newSize: compressedBlob.size }
            };

        } catch (error: unknown) {
            console.error('Adobe-Level Compression error:', error);
            return {
                success: false,
                document: doc,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private async compressImageInBrowser(data: Uint8Array, width: number, height: number, factor: number): Promise<Uint8Array | null> {
        return new Promise((resolve) => {
            try {
                // @ts-expect-error - Uint8Array is compatible with BlobPart at runtime
                const blob = new Blob([data]);
                const url = URL.createObjectURL(blob);
                const img = new Image();

                img.onload = () => {
                    URL.revokeObjectURL(url);
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    if (!ctx) return resolve(null);

                    canvas.width = Math.floor(width * factor);
                    canvas.height = Math.floor(height * factor);

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

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
            } catch {
                resolve(null);
            }
        });
    }
}
