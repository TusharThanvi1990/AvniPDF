export type ScreenPoint = {
    x: number;
    y: number;
};

export type PdfPoint = {
    x: number;
    y: number;
};

export type ScreenRect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

export type PdfRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export const screenToPdfPoint = (
    point: ScreenPoint,
    pageHeightPoints: number,
    scale: number,
): PdfPoint => {
    return {
        x: point.x / scale,
        y: pageHeightPoints - point.y / scale,
    };
};

export const screenRectToPdfRect = (
    rect: ScreenRect,
    pageHeightPoints: number,
    scale: number,
): PdfRect => {
    const x = rect.left / scale;
    const width = rect.width / scale;
    const height = rect.height / scale;
    const y = pageHeightPoints - (rect.top + rect.height) / scale;

    return { x, y, width, height };
};

export const pdfPointToScreenPoint = (
    point: PdfPoint,
    pageHeightPoints: number,
    scale: number,
): ScreenPoint => {
    return {
        x: point.x * scale,
        y: (pageHeightPoints - point.y) * scale,
    };
};
