"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { avniEngine } from '../src/engine/core/Orchestrator';
import { PDFEditProcessor } from '../src/engine/processors/PDFEditProcessor';
import { AvniDocument } from '../src/engine/types';
import { PDFEditOperation, TextRun } from '../src/engine/editor/types';
import { buildPageTextRuns } from '../src/engine/editor/textRunExtractor';
import { hitTestTextRuns } from '../src/engine/editor/hitTest';
import { pdfToContainer, screenToPdf } from '../src/engine/editor/coordinates';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-workers/pdf.worker.min.js';

type EditorTool = 'add-text' | 'edit-text';

type PageMeta = {
    width: number;
    height: number;
};

type ActiveInlineEditor = {
    pageIndex: number;
    value: string;
    pdfX: number;
    pdfY: number;
    pdfBaselineY: number;
    width: number;
    height: number;
    fontSize: number;
    containerX: number;
    containerY: number;
    screenWidth: number;
    screenHeight: number;
};

type SelectionBox = {
    pageIndex: number;
    startPdfX: number;
    startPdfY: number;
    endPdfX: number;
    endPdfY: number;
};

const buildDoc = (blob: Blob, name: string): AvniDocument => ({
    id: crypto.randomUUID(),
    name,
    blob,
    type: 'pdf',
    size: blob.size,
    metadata: {},
    history: [],
});

const PDFEditorEngine = () => {
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [workingBlob, setWorkingBlob] = useState<Blob | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<string>('');
    const [tool, setTool] = useState<EditorTool>('edit-text');
    const [insertText, setInsertText] = useState('New text');
    const [insertFontSize, setInsertFontSize] = useState(14);
    const [scale] = useState(1.4);
    const [pageMeta, setPageMeta] = useState<Record<number, PageMeta>>({});
    const [activeInlineEditor, setActiveInlineEditor] = useState<ActiveInlineEditor | null>(null);
    const inlineEditorRef = useRef<HTMLTextAreaElement | null>(null);
    const pageContainerRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const pageTextRunsRef = useRef<Record<number, TextRun[]>>({});

    // Selection & drag-to-select tracking
    const [selectedRuns, setSelectedRuns] = useState<TextRun[]>([]);
    const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ pageIndex: number; pdfX: number; pdfY: number } | null>(null);

    const [rotateDegrees, setRotateDegrees] = useState<90 | 180 | 270>(90);
    const [pageOpIndex, setPageOpIndex] = useState(0);

    useEffect(() => {
        const hasProcessor = avniEngine.getAvailableProcessors().includes('pdf-editor-core');
        if (!hasProcessor) {
            avniEngine.registerProcessor(new PDFEditProcessor());
        }
    }, []);

    const activeBlob = useMemo(() => workingBlob ?? sourceFile, [workingBlob, sourceFile]);

    const previewUrl = useMemo(() => {
        if (!activeBlob) return null;
        return URL.createObjectURL(activeBlob);
    }, [activeBlob]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    useEffect(() => {
        if (!activeInlineEditor) return;
        inlineEditorRef.current?.focus();
        inlineEditorRef.current?.select();
    }, [activeInlineEditor]);

    const runOperation = async (operation: PDFEditOperation) => {
        if (!activeBlob) return;

        setIsProcessing(true);
        setMessage('Running editor operation...');

        try {
            const baseName = sourceFile?.name ?? 'document.pdf';
            const initial = buildDoc(activeBlob, baseName);

            const results = await avniEngine.runPipeline(initial, {
                tasks: [
                    {
                        processorName: 'pdf-editor-core',
                        params: { operations: [operation] },
                    },
                ],
            });

            const last = results[results.length - 1];

            if (!last?.success) {
                setMessage(last?.error ?? 'Operation failed');
                return;
            }

            setWorkingBlob(last.document.blob);
            setMessage(
                `Applied ${operation.type}. Size ${((last.metrics?.originalSize ?? 0) / 1024).toFixed(1)}KB → ${
                    ((last.metrics?.newSize ?? 0) / 1024).toFixed(1)
                }KB`,
            );
        } catch (error: unknown) {
            setMessage(error instanceof Error ? error.message : 'Operation failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const download = () => {
        if (!activeBlob) return;
        const name = sourceFile?.name.replace(/\.pdf$/i, '') ?? 'edited';
        const url = URL.createObjectURL(activeBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name}-engine-edited.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const loadTextRuns = async (page: any, pageIndex: number) => {
        const meta = pageMeta[pageIndex];
        if (!meta) return;

        try {
            const textContent = await page.getTextContent();
            const runs = buildPageTextRuns(pageIndex, meta.height, textContent.items ?? []);
            pageTextRunsRef.current[pageIndex] = runs;
        } catch (error) {
            console.error('Failed to read text content for page', pageIndex, error);
        }
    };

    const handleAddTextAtClick = async (event: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
        if (!activeBlob || tool !== 'add-text') return;

        const meta = pageMeta[pageIndex];
        if (!meta) return;
        const container = pageContainerRefs.current[pageIndex];
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const pdfPoint = screenToPdf(event.clientX, event.clientY, rect, scale, meta.height);

        await runOperation({
            type: 'insert-text',
            pageIndex,
            text: insertText,
            x: pdfPoint.x,
            y: pdfPoint.y,
            size: insertFontSize,
        });
    };

    const handleEditTextAtClick = (event: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
        if (tool !== 'edit-text') return;
        const meta = pageMeta[pageIndex];
        const container = pageContainerRefs.current[pageIndex];
        if (!meta || !container) return;

        const rect = container.getBoundingClientRect();
        const pdfPoint = screenToPdf(event.clientX, event.clientY, rect, scale, meta.height);
        const hit = hitTestTextRuns(pdfPoint, pageTextRunsRef.current[pageIndex], 6);

        if (!hit) {
            setMessage('No text found at click position. Try clicking directly on text.');
            return;
        }

        // Top-left of the run in container-relative pixels (position: absolute)
        const pos = pdfToContainer(hit.pdfX, hit.pdfY + hit.height, scale, meta.height);

        setActiveInlineEditor({
            pageIndex,
            value: hit.text,
            pdfX: hit.pdfX,
            pdfY: hit.pdfY,
            pdfBaselineY: hit.pdfBaselineY,
            width: hit.width,
            height: hit.height,
            fontSize: hit.fontSize,
            containerX: pos.x,
            containerY: pos.y,
            screenWidth: Math.max(80, hit.width * scale + 8),
            screenHeight: Math.max(20, hit.height * scale + 4),
        });
    };

    const commitInlineEdit = async () => {
        if (!activeInlineEditor) return;
        const editor = activeInlineEditor;
        setActiveInlineEditor(null);

        await runOperation({
            type: 'replace-text',
            pageIndex: editor.pageIndex,
            x: editor.pdfX,
            y: editor.pdfY,
            width: editor.width,
            height: Math.max(8, editor.height),
            baselineY: editor.pdfBaselineY,
            newText: editor.value,
            size: editor.fontSize,
        });
    };

    // Helper: Get all text runs within a selection box (in PDF space)
    const getRunsInSelection = (pageIndex: number, box: SelectionBox): TextRun[] => {
        const runs = pageTextRunsRef.current[pageIndex];
        if (!runs) return [];

        const minX = Math.min(box.startPdfX, box.endPdfX);
        const maxX = Math.max(box.startPdfX, box.endPdfX);
        const minY = Math.min(box.startPdfY, box.endPdfY);
        const maxY = Math.max(box.startPdfY, box.endPdfY);

        return runs.filter(
            (run) =>
                run.pdfX < maxX &&
                run.pdfX + run.width > minX &&
                run.pdfY < maxY &&
                run.pdfY + run.height > minY,
        );
    };

    // Handler: Mouse down - start selection drag
    const handlePageMouseDown = (event: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
        if (tool !== 'edit-text' || event.button !== 0) return; // left-click only
        event.preventDefault();

        const meta = pageMeta[pageIndex];
        const container = pageContainerRefs.current[pageIndex];
        if (!meta || !container) return;

        const rect = container.getBoundingClientRect();
        const pdfPoint = screenToPdf(event.clientX, event.clientY, rect, scale, meta.height);

        dragStartRef.current = { pageIndex, pdfX: pdfPoint.x, pdfY: pdfPoint.y };
        setSelectionBox({
            pageIndex,
            startPdfX: pdfPoint.x,
            startPdfY: pdfPoint.y,
            endPdfX: pdfPoint.x,
            endPdfY: pdfPoint.y,
        });
        setIsDragging(true);
        setSelectedRuns([]);
        setActiveInlineEditor(null);
    };

    // Handler: Mouse move - update selection box
    const handlePageMouseMove = (event: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
        if (!isDragging || !dragStartRef.current || dragStartRef.current.pageIndex !== pageIndex) return;

        const meta = pageMeta[pageIndex];
        const container = pageContainerRefs.current[pageIndex];
        if (!meta || !container) return;

        const rect = container.getBoundingClientRect();
        const pdfPoint = screenToPdf(event.clientX, event.clientY, rect, scale, meta.height);

        const newBox: SelectionBox = {
            pageIndex,
            startPdfX: dragStartRef.current.pdfX,
            startPdfY: dragStartRef.current.pdfY,
            endPdfX: pdfPoint.x,
            endPdfY: pdfPoint.y,
        };
        setSelectionBox(newBox);
    };

    // Handler: Mouse up - finalize selection
    const handlePageMouseUp = (event: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
        if (!isDragging || !selectionBox || selectionBox.pageIndex !== pageIndex) {
            setIsDragging(false);
            return;
        }

        const runs = getRunsInSelection(pageIndex, selectionBox);
        setSelectedRuns(runs);
        setIsDragging(false);

        if (runs.length > 0) {
            setMessage(`Selected ${runs.length} text run(s). Click to edit or press Delete to remove.`);
        } else {
            setMessage('No text selected. Try dragging across text.');
            setSelectionBox(null);
        }
    };

    // Handler: Edit selected text (open inline editor)
    const handleEditSelected = () => {
        if (selectedRuns.length === 0 || !selectionBox) return;

        // Sort runs by position for proper concatenation
        const sorted = [...selectedRuns].sort((a, b) => {
            if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;
            if (Math.abs(b.pdfY - a.pdfY) > 10) return b.pdfY - a.pdfY; // Different rows
            return a.pdfX - b.pdfX; // Same row, left to right
        });

        const pageIndex = sorted[0].pageIndex;
        const meta = pageMeta[pageIndex];
        const container = pageContainerRefs.current[pageIndex];
        if (!meta || !container) return;

        const concatenatedText = sorted.map((r) => r.text).join(' ');
        const minX = Math.min(...sorted.map((r) => r.pdfX));
        const minY = Math.min(...sorted.map((r) => r.pdfY));
        const maxX = Math.max(...sorted.map((r) => r.pdfX + r.width));
        const maxY = Math.max(...sorted.map((r) => r.pdfY + r.height));
        const avgFontSize = sorted.reduce((sum, r) => sum + r.fontSize, 0) / sorted.length;
        const avgBaselineY = sorted.reduce((sum, r) => sum + r.pdfBaselineY, 0) / sorted.length;

        const pos = pdfToContainer(minX, minY + (maxY - minY), scale, meta.height);

        setActiveInlineEditor({
            pageIndex,
            value: concatenatedText,
            pdfX: minX,
            pdfY: minY,
            pdfBaselineY: avgBaselineY,
            width: maxX - minX,
            height: maxY - minY,
            fontSize: avgFontSize,
            containerX: pos.x,
            containerY: pos.y,
            screenWidth: Math.max(150, (maxX - minX) * scale + 12),
            screenHeight: Math.max(30, (maxY - minY) * scale + 8),
        });

        setSelectedRuns([]);
        setSelectionBox(null);
    };

    // Handler: Delete selected (redact area)
    const handleDeleteSelected = async () => {
        if (selectedRuns.length === 0 || !selectionBox) return;

        const pageIndex = selectionBox.pageIndex;
        const meta = pageMeta[pageIndex];
        if (!meta) return;

        const minX = Math.min(selectionBox.startPdfX, selectionBox.endPdfX);
        const maxX = Math.max(selectionBox.startPdfX, selectionBox.endPdfX);
        const minY = Math.min(selectionBox.startPdfY, selectionBox.endPdfY);
        const maxY = Math.max(selectionBox.startPdfY, selectionBox.endPdfY);

        setSelectedRuns([]);
        setSelectionBox(null);

        await runOperation({
            type: 'redact-area',
            pageIndex,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            color: { r: 0, g: 0, b: 0 },
        });
    };

    return (
        <div className="min-h-screen p-6 bg-[var(--content-bg)] text-[var(--content-text)]">
            <div className="max-w-6xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold">Avni Open PDF Editor (Live Mouse Editing)</h1>

                <div className="card space-y-4">
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                            const next = e.target.files?.[0] ?? null;
                            setSourceFile(next);
                            setWorkingBlob(next);
                            setPageMeta({});
                            pageTextRunsRef.current = {};
                            setActiveInlineEditor(null);
                            setMessage(next ? 'PDF loaded into editor engine.' : '');
                        }}
                        className="p-2 border rounded"
                    />

                    {activeBlob && (
                        <p className="text-sm" style={{ color: 'var(--footer-muted)' }}>
                            Current file size: {(activeBlob.size / 1024).toFixed(1)} KB
                        </p>
                    )}
                </div>

                {activeBlob && (
                    <>
                        <div className="card space-y-4">
                            <h2 className="text-xl font-semibold">Editing Tools</h2>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    className="px-4 py-2 rounded-md"
                                    style={{
                                        background: tool === 'edit-text' ? 'var(--hero-bg)' : 'var(--card-bg)',
                                        color: tool === 'edit-text' ? 'var(--hero-text)' : 'var(--card-text)',
                                        border: '1px solid var(--card-border, rgba(127,127,127,0.4))',
                                    }}
                                    onClick={() => setTool('edit-text')}
                                >
                                    Edit Text (click text)
                                </button>
                                <button
                                    className="px-4 py-2 rounded-md"
                                    style={{
                                        background: tool === 'add-text' ? 'var(--hero-bg)' : 'var(--card-bg)',
                                        color: tool === 'add-text' ? 'var(--hero-text)' : 'var(--card-text)',
                                        border: '1px solid var(--card-border, rgba(127,127,127,0.4))',
                                    }}
                                    onClick={() => setTool('add-text')}
                                >
                                    Add Text (click page)
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    value={insertText}
                                    onChange={(e) => setInsertText(e.target.value)}
                                    className="p-2 border rounded"
                                    placeholder="Text to add when clicking page"
                                />
                                <input
                                    type="number"
                                    value={insertFontSize}
                                    onChange={(e) => setInsertFontSize(Number(e.target.value))}
                                    className="p-2 border rounded"
                                    placeholder="Font size"
                                />
                            </div>

                            <p className="text-sm" style={{ color: 'var(--footer-muted)' }}>
                                Mode: <strong>{tool === 'edit-text' ? 'Edit Text' : 'Add Text'}</strong>. 
                                {tool === 'edit-text' 
                                    ? ' Drag to select text (or click a single text run), then click Edit in the popup toolbar or use the inline editor.'
                                    : ' Click on the PDF to insert new text at that location.'
                                }
                            </p>
                        </div>

                        <div className="card space-y-4">
                            <h2 className="text-xl font-semibold">Page Operations</h2>
                            <div className="grid grid-cols-2 gap-3">
                                <select
                                    value={rotateDegrees}
                                    onChange={(e) => setRotateDegrees(Number(e.target.value) as 90 | 180 | 270)}
                                    className="p-2 border rounded"
                                >
                                    <option value={90}>Rotate 90°</option>
                                    <option value={180}>Rotate 180°</option>
                                    <option value={270}>Rotate 270°</option>
                                </select>
                                <input
                                    type="number"
                                    value={pageOpIndex}
                                    onChange={(e) => setPageOpIndex(Number(e.target.value))}
                                    className="p-2 border rounded"
                                    placeholder="Page index"
                                />
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => runOperation({ type: 'rotate-page', pageIndex: pageOpIndex, degrees: rotateDegrees })}
                                    disabled={isProcessing}
                                    className="px-4 py-2 rounded-md"
                                    style={{ background: 'var(--hero-bg)', color: 'var(--hero-text)' }}
                                >
                                    Rotate Page
                                </button>
                                <button
                                    onClick={() => runOperation({ type: 'delete-page', pageIndex: pageOpIndex })}
                                    disabled={isProcessing}
                                    className="px-4 py-2 rounded-md"
                                    style={{ background: 'var(--footer-link)', color: 'var(--hero-text)' }}
                                >
                                    Delete Page
                                </button>
                                <button
                                    onClick={download}
                                    disabled={isProcessing}
                                    className="px-4 py-2 rounded-md"
                                    style={{ background: 'var(--footer-link)', color: 'var(--hero-text)' }}
                                >
                                    Download Edited PDF
                                </button>
                            </div>
                        </div>

                        {previewUrl && (
                            <div className="card space-y-4">
                                <h2 className="text-xl font-semibold">Live Preview</h2>
                                <Document
                                    file={previewUrl}
                                    onLoadSuccess={({ numPages: pages }) => setNumPages(pages)}
                                    loading={<p>Loading PDF preview...</p>}
                                >
                                    {Array.from({ length: numPages }).map((_, index) => (
                                        <div
                                            key={index}
                                            className="relative mb-6 border rounded overflow-hidden"
                                            ref={(element) => {
                                                pageContainerRefs.current[index] = element;
                                            }}
                                            onMouseDown={(e) => handlePageMouseDown(e, index)}
                                            onMouseMove={(e) => handlePageMouseMove(e, index)}
                                            onMouseUp={(e) => handlePageMouseUp(e, index)}
                                            onClick={(event) => {
                                                if (tool === 'add-text') {
                                                    handleAddTextAtClick(event, index);
                                                    return;
                                                }
                                                // Single click on text when not dragging
                                                if (!isDragging && selectedRuns.length === 0) {
                                                    handleEditTextAtClick(event, index);
                                                }
                                            }}
                                            style={{ cursor: tool === 'add-text' ? 'crosshair' : 'text', userSelect: 'none' }}
                                        >
                                            <Page
                                                pageNumber={index + 1}
                                                scale={scale}
                                                renderAnnotationLayer={false}
                                                renderTextLayer
                                                onLoadSuccess={(page) => {
                                                    const viewport = page.getViewport({ scale: 1 });
                                                    setPageMeta((prev) => ({
                                                        ...prev,
                                                        [index]: {
                                                            width: viewport.width,
                                                            height: viewport.height,
                                                        },
                                                    }));
                                                    void loadTextRuns(page, index);
                                                }}
                                            />

                                            {/* Selection highlight overlay */}
                                            {selectionBox && selectionBox.pageIndex === index && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        left: 0,
                                                        top: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        pointerEvents: 'none',
                                                        zIndex: 10,
                                                    }}
                                                >
                                                    {selectedRuns.map((run, i) => {
                                                        const pos = pdfToContainer(run.pdfX, run.pdfY + run.height, scale, pageMeta[index]?.height || 792);
                                                        return (
                                                            <div
                                                                key={i}
                                                                style={{
                                                                    position: 'absolute',
                                                                    left: `${pos.x}px`,
                                                                    top: `${pos.y - run.height * scale}px`,
                                                                    width: `${run.width * scale}px`,
                                                                    height: `${run.height * scale}px`,
                                                                    background: 'rgba(59, 130, 246, 0.3)',
                                                                    border: '2px solid rgb(59, 130, 246)',
                                                                    borderRadius: '2px',
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Selection toolbar */}
                                            {selectedRuns.length > 0 && selectionBox?.pageIndex === index && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: '4px',
                                                        right: '4px',
                                                        background: 'white',
                                                        border: '1px solid #999',
                                                        borderRadius: '4px',
                                                        padding: '6px',
                                                        zIndex: 100,
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                        display: 'flex',
                                                        gap: '4px',
                                                    }}
                                                >
                                                    <button
                                                        onClick={() => handleEditSelected()}
                                                        style={{
                                                            padding: '4px 8px',
                                                            fontSize: '12px',
                                                            background: '#3B82F6',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '3px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSelected()}
                                                        style={{
                                                            padding: '4px 8px',
                                                            fontSize: '12px',
                                                            background: '#EF4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '3px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedRuns([]);
                                                            setSelectionBox(null);
                                                        }}
                                                        style={{
                                                            padding: '4px 8px',
                                                            fontSize: '12px',
                                                            background: '#999',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '3px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            )}

                                            {activeInlineEditor?.pageIndex === index && (
                                                <textarea
                                                    ref={inlineEditorRef}
                                                    autoFocus
                                                    value={activeInlineEditor.value}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setActiveInlineEditor((prev) => (prev ? { ...prev, value: val } : prev));
                                                    }}
                                                    onBlur={() => {
                                                        setTimeout(() => {
                                                            if (document.activeElement !== inlineEditorRef.current) {
                                                                void commitInlineEdit();
                                                            }
                                                        }, 150);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            void commitInlineEdit();
                                                        }
                                                        if (e.key === 'Escape') {
                                                            setActiveInlineEditor(null);
                                                        }
                                                    }}
                                                    className="absolute z-50 resize-none border border-blue-400 rounded px-1 py-0.5 shadow-lg"
                                                    style={{
                                                        left: `${activeInlineEditor.containerX}px`,
                                                        top: `${activeInlineEditor.containerY}px`,
                                                        width: `${activeInlineEditor.screenWidth}px`,
                                                        minHeight: `${activeInlineEditor.screenHeight}px`,
                                                        fontSize: `${activeInlineEditor.fontSize * scale}px`,
                                                        lineHeight: 1.2,
                                                        background: 'rgba(255,255,255,0.95)',
                                                        color: '#111827',
                                                        pointerEvents: 'auto',
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </Document>
                            </div>
                        )}
                    </>
                )}

                {message && <p className="text-sm">{message}</p>}
            </div>
        </div>
    );
};

export default PDFEditorEngine;
