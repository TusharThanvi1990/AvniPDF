export type PDFColor = {
    r: number;
    g: number;
    b: number;
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
    newText: string;
    size?: number;
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
