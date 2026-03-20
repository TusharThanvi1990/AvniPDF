export type PDFColor = {
    r: number;
    g: number;
    b: number;
};

export type PDFFontSpec = {
    cssFamily?: string;
    pdfName?: string;
    sizePt: number;
    weight?: string;
    color?: PDFColor;
    lineHeight?: number;
    charSpacing?: number;
};

export type TextRun = {
    text: string;
    pdfX: number;
    pdfY: number; // bottom-left origin in PDF points
    width: number;
    height: number;
    fontSize: number;
    pdfBaselineY: number;
    pageIndex: number;
};

export type InsertTextOperation = {
    type: 'insert-text';
    pageIndex: number;
    text: string;
    x: number;
    y: number;
    size?: number;
    color?: PDFColor;
};

export type RedactAreaOperation = {
    type: 'redact-area';
    pageIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: PDFColor;
};

export type ReplaceTextOperation = {
    type: 'replace-text';
    pageIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
    baselineY?: number;
    newText: string;
    size?: number;
    font?: PDFFontSpec;
    color?: PDFColor;
    backgroundColor?: PDFColor;
};

export type RotatePageOperation = {
    type: 'rotate-page';
    pageIndex: number;
    degrees: 90 | 180 | 270;
};

export type DeletePageOperation = {
    type: 'delete-page';
    pageIndex: number;
};

export type PDFEditOperation =
    | InsertTextOperation
    | RedactAreaOperation
    | ReplaceTextOperation
    | RotatePageOperation
    | DeletePageOperation;
