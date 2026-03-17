import { degrees, rgb, PDFDocument, StandardFonts } from 'pdf-lib';
import { AvniDocument } from '../types';
import { PDFColor, PDFEditOperation } from './types';

const clampColor = (color: PDFColor) => ({
    r: Math.min(1, Math.max(0, color.r)),
    g: Math.min(1, Math.max(0, color.g)),
    b: Math.min(1, Math.max(0, color.b)),
});

export class PDFEditSession {
    private constructor(private readonly pdfDoc: PDFDocument) {}

    static async fromAvniDocument(doc: AvniDocument): Promise<PDFEditSession> {
        const bytes = await doc.blob.arrayBuffer();
        const loadedDoc = await PDFDocument.load(bytes);
        return new PDFEditSession(loadedDoc);
    }

    getPageCount(): number {
        return this.pdfDoc.getPageCount();
    }

    async applyOperations(operations: PDFEditOperation[]): Promise<void> {
        if (operations.length === 0) return;

        const font = await this.pdfDoc.embedFont(StandardFonts.Helvetica);

        for (const operation of operations) {
            if (operation.type === 'delete-page') {
                this.deletePage(operation.pageIndex);
                continue;
            }

            const page = this.pdfDoc.getPage(operation.pageIndex);

            if (operation.type === 'insert-text') {
                const textColor = clampColor(operation.color ?? { r: 0, g: 0, b: 0 });

                page.drawText(operation.text, {
                    x: operation.x,
                    y: operation.y,
                    size: operation.size ?? 14,
                    font,
                    color: rgb(textColor.r, textColor.g, textColor.b),
                });
                continue;
            }

            if (operation.type === 'redact-area') {
                const fill = clampColor(operation.color ?? { r: 1, g: 1, b: 1 });

                page.drawRectangle({
                    x: operation.x,
                    y: operation.y,
                    width: operation.width,
                    height: operation.height,
                    color: rgb(fill.r, fill.g, fill.b),
                });
                continue;
            }

            if (operation.type === 'replace-text') {
                const bg = clampColor(operation.backgroundColor ?? { r: 1, g: 1, b: 1 });
                const textColor = clampColor(operation.color ?? { r: 0, g: 0, b: 0 });
                const textSize = operation.size ?? Math.max(8, operation.height * 0.8);

                page.drawRectangle({
                    x: operation.x,
                    y: operation.y,
                    width: operation.width,
                    height: operation.height,
                    color: rgb(bg.r, bg.g, bg.b),
                });

                page.drawText(operation.newText, {
                    x: operation.x,
                    y: operation.y + Math.max(0, (operation.height - textSize) / 2),
                    size: textSize,
                    font,
                    color: rgb(textColor.r, textColor.g, textColor.b),
                    maxWidth: operation.width,
                });
                continue;
            }

            if (operation.type === 'rotate-page') {
                const currentAngle = page.getRotation().angle;
                page.setRotation(degrees(currentAngle + operation.degrees));
            }
        }
    }

    async toBlob(): Promise<Blob> {
        const bytes = await this.pdfDoc.save({ useObjectStreams: true });

        // Ensure we provide an ArrayBuffer to the Blob constructor to satisfy
        // TypeScript's strict types (pdf-lib may return a Uint8Array with a
        // non-ArrayBuffer underlying buffer type). Create a copy whose
        // backing buffer is a plain ArrayBuffer.
        const uint8 = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
        const arrayBuffer = uint8.slice().buffer;

        return new Blob([arrayBuffer], { type: 'application/pdf' });
    }

    private deletePage(pageIndex: number): void {
        if (this.pdfDoc.getPageCount() <= 1) {
            throw new Error('Cannot delete the last remaining page');
        }

        this.pdfDoc.removePage(pageIndex);
    }
}
