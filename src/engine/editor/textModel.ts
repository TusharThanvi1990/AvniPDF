export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
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
    fontSize: number;
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
