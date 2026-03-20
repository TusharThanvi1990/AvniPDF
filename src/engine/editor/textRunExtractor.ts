import { TextRun } from './types';

type TextItemLike = {
    str?: string;
    transform?: number[];
    width?: number;
    height?: number;
};

const toRun = (pageIndex: number, item: TextItemLike, pageHeight: number): TextRun | null => {
    if (!item.str?.trim() || !item.transform) return null;

    const pdfX = item.transform[4] ?? 0;
    const pdfBaselineY = item.transform[5] ?? 0;
    const fontSize = Math.max(6, Math.abs(item.transform[3] ?? 10));
    const pdfWidth = Math.max(3, item.width ?? item.str.length * fontSize * 0.6);
    const pdfHeight = Math.max(6, item.height ?? fontSize);
    const pdfY = pdfBaselineY - pdfHeight * 0.2; // bottom of run, slightly below baseline

    return {
        pageIndex,
        text: item.str,
        pdfX,
        pdfY,
        pdfBaselineY,
        width: pdfWidth,
        height: pdfHeight,
        fontSize,
    };
};

export const buildPageTextRuns = (
    pageIndex: number,
    pageHeight: number,
    items: unknown[],
): TextRun[] => {
    const runs: TextRun[] = [];
    for (const item of items) {
        const run = toRun(pageIndex, item as TextItemLike, pageHeight);
        if (run) runs.push(run);
    }
    return runs;
};
