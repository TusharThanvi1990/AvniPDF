export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

export type TextRunFont = {
    cssFamily?: string;
    pdfName?: string;
    sizePt: number;
    weight?: string;
    color?: {
        r: number;
        g: number;
        b: number;
    };
    lineHeight?: number;
    charSpacing?: number;
};

export type TextRun = {
    id: string;
    pageIndex: number;
    text: string;
    viewportRect: Rect;
    pdfRect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    pdfBaseline: {
        x: number;
        y: number;
    };
    fontSize: number;
    font: TextRunFont;
};

export type PageTextIndex = {
    pageIndex: number;
    pageWidth: number;
    pageHeight: number;
    runs: TextRun[];
};

export type HitTestResult = {
    run: TextRun;
    distance: number;
};
