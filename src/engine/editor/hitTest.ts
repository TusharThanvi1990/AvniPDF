import { HitTestResult, PageTextIndex, Rect, TextRun } from './textModel';

const pointToRectDistance = (x: number, y: number, rect: Rect): number => {
    const dx = Math.max(rect.left - x, 0, x - (rect.left + rect.width));
    const dy = Math.max(rect.top - y, 0, y - (rect.top + rect.height));
    return Math.sqrt(dx * dx + dy * dy);
};

const containsPoint = (x: number, y: number, rect: Rect): boolean => {
    return (
        x >= rect.left &&
        x <= rect.left + rect.width &&
        y >= rect.top &&
        y <= rect.top + rect.height
    );
};

const pickClosestRun = (x: number, y: number, runs: TextRun[]): HitTestResult | null => {
    if (runs.length === 0) return null;

    const containingRuns = runs.filter((run) => containsPoint(x, y, run.viewportRect));
    if (containingRuns.length > 0) {
        const ranked = containingRuns
            .map((run) => {
                const area = run.viewportRect.width * run.viewportRect.height;
                const centerX = run.viewportRect.left + run.viewportRect.width / 2;
                const centerY = run.viewportRect.top + run.viewportRect.height / 2;
                const centerDist = Math.hypot(centerX - x, centerY - y);
                return { run, area, centerDist };
            })
            .sort((a, b) => {
                if (a.area !== b.area) return a.area - b.area;
                return a.centerDist - b.centerDist;
            });

        return { run: ranked[0].run, distance: 0 };
    }

    let bestRun: TextRun | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const run of runs) {
        const distance = pointToRectDistance(x, y, run.viewportRect);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestRun = run;
        }
    }

    if (!bestRun) return null;
    return { run: bestRun, distance: bestDistance };
};

export const hitTestTextRun = (
    index: PageTextIndex | undefined,
    clickX: number,
    clickY: number,
    maxDistance = 8,
): HitTestResult | null => {
    if (!index) return null;

    const result = pickClosestRun(clickX, clickY, index.runs);
    if (!result) return null;

    return result.distance <= maxDistance ? result : null;
};
