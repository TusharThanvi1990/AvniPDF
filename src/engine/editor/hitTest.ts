import { TextRun } from './types';

const containsPoint = (x: number, y: number, run: TextRun): boolean => {
    return x >= run.pdfX && x <= run.pdfX + run.width && y >= run.pdfY && y <= run.pdfY + run.height;
};

export const hitTestTextRuns = (
    pdfPoint: { x: number; y: number },
    runs: TextRun[] | undefined,
    tolerance = 5,
): TextRun | null => {
    if (!runs || runs.length === 0) return null;

    const contained = runs.find((run) => containsPoint(pdfPoint.x, pdfPoint.y, run));
    if (contained) return contained;

    let closest: TextRun | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const run of runs) {
        const dx = Math.max(run.pdfX - pdfPoint.x, 0, pdfPoint.x - (run.pdfX + run.width));
        const dy = Math.max(run.pdfY - pdfPoint.y, 0, pdfPoint.y - (run.pdfY + run.height));
        const dist = Math.hypot(dx, dy);
        if (dist < bestDistance) {
            bestDistance = dist;
            closest = run;
        }
    }

    if (closest && bestDistance <= tolerance) return closest;
    return null;
};
