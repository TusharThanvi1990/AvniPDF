export type ScreenPoint = { x: number; y: number };
export type PdfPoint = { x: number; y: number };

export const screenToPdf = (
    clientX: number,
    clientY: number,
    canvasRect: DOMRect,
    scale: number,
    pageHeightPoints: number,
): PdfPoint => {
    const canvasX = clientX - canvasRect.left;
    const canvasY = clientY - canvasRect.top;
    return {
        x: canvasX / scale,
        y: pageHeightPoints - canvasY / scale,
    };
};

// Returns position relative to the page container div (for position: absolute child)
export const pdfToContainer = (
    pdfX: number,
    pdfY: number,
    scale: number,
    pageHeightPoints: number,
): ScreenPoint => {
    return {
        x: pdfX * scale,
        y: (pageHeightPoints - pdfY) * scale,
    };
};
