import { PageTextIndex, TextRun } from './textModel';

type TextItemLike = {
    str?: string;
    transform?: number[];
    width?: number;
    height?: number;
};

const toRun = (
    pageIndex: number,
    itemIndex: number,
    item: TextItemLike,
    scale: number,
    pageHeight: number,
): TextRun | null => {
    if (!item.str || !item.transform) return null;

    const left = item.transform[4] ?? 0;
    const baseY = item.transform[5] ?? 0;
    const height = Math.max(8, item.height ?? 10);
    const width = Math.max(3, item.width ?? item.str.length * 6);
    const top = baseY - height;

    const pdfX = left / scale;
    const pdfTop = top / scale;
    const pdfY = pageHeight - (pdfTop + height / scale);
    const pdfWidth = width / scale;
    const pdfHeight = height / scale;

    return {
        id: `${pageIndex}-${itemIndex}-${left}-${top}`,
        pageIndex,
        text: item.str,
        viewportRect: {
            left,
            top,
            width,
            height,
        },
        pdfRect: {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
        },
        fontSize: Math.max(8, pdfHeight * 0.8),
    };
};

export const buildPageTextIndex = (
    pageIndex: number,
    pageWidth: number,
    pageHeight: number,
    items: unknown[],
    scale: number,
): PageTextIndex => {
    const runs: TextRun[] = [];

    for (let index = 0; index < items.length; index += 1) {
        const run = toRun(
            pageIndex,
            index,
            items[index] as TextItemLike,
            scale,
            pageHeight,
        );

        if (run) {
            runs.push(run);
        }
    }

    return {
        pageIndex,
        pageWidth,
        pageHeight,
        runs,
    };
};
