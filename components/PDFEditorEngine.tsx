"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { avniEngine } from '../src/engine/core/Orchestrator';
import { PDFEditProcessor } from '../src/engine/processors/PDFEditProcessor';
import { AvniDocument } from '../src/engine/types';
import { PDFEditOperation } from '../src/engine/editor/types';
import { hitTestTextRun } from '../src/engine/editor/hitTest';
import { PageTextIndex } from '../src/engine/editor/textModel';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-workers/pdf.worker.min.js';

type EditorTool = 'add-text' | 'edit-text';

type PageMeta = {
    width: number;
    height: number;
};

type ActiveInlineEditor = {
    pageIndex: number;
    runId: string;
    value: string;
    left: number;
    top: number;
    width: number;
    height: number;
    fontSize: number;
    pdfRect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
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
    const [pageTextIndex, setPageTextIndex] = useState<Record<number, PageTextIndex>>({});
    const [activeInlineEditor, setActiveInlineEditor] = useState<ActiveInlineEditor | null>(null);
    const inlineEditorRef = useRef<HTMLTextAreaElement | null>(null);
    const pageContainerRefs = useRef<Record<number, HTMLDivElement | null>>({});

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
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
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
                }KB`
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

    const handleAddTextAtClick = async (event: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
        if (!activeBlob || tool !== 'add-text') return;

        const meta = pageMeta[pageIndex];
        if (!meta) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const nearestRun = hitTestTextRun(pageTextIndex[pageIndex], clickX, clickY, 36)?.run;

        const pdfX = clickX / scale;
        const pdfY = nearestRun ? nearestRun.pdfRect.y : meta.height - clickY / scale;
        const fontSize = nearestRun ? nearestRun.fontSize : insertFontSize;

        await runOperation({
            type: 'insert-text',
            pageIndex,
            text: insertText,
            x: pdfX,
            y: pdfY,
            size: fontSize,
        });
    };

    const handleEditTextAtClick = (event: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
        if (tool !== 'edit-text') return;

        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const hit = hitTestTextRun(pageTextIndex[pageIndex], clickX, clickY, 10);
        if (!hit) {
            setMessage('No text found at click position. Try clicking directly on text.');
            return;
        }

        setActiveInlineEditor({
            pageIndex,
            runId: hit.run.id,
            value: hit.run.text,
            left: hit.run.viewportRect.left,
            top: hit.run.viewportRect.top,
            width: Math.max(40, hit.run.viewportRect.width + 6),
            height: Math.max(20, hit.run.viewportRect.height + 6),
            fontSize: hit.run.fontSize,
            pdfRect: hit.run.pdfRect,
        });
    };

    const commitInlineEdit = async () => {
        if (!activeInlineEditor) return;

        const editor = activeInlineEditor;
        setActiveInlineEditor(null);

        await runOperation({
            type: 'replace-text',
            pageIndex: editor.pageIndex,
            x: editor.pdfRect.x,
            y: editor.pdfRect.y,
            width: editor.pdfRect.width,
            height: Math.max(8, editor.pdfRect.height),
            newText: editor.value,
            size: editor.fontSize,
        });
    };

    const collectTextLayerFromDom = (pageIndex: number) => {
        const meta = pageMeta[pageIndex];
        if (!meta) return;

        const container = pageContainerRefs.current[pageIndex];
        if (!container) return;

        const layer = container.querySelector('.react-pdf__Page__textContent');
        if (!layer) return;

        const containerRect = container.getBoundingClientRect();
        const spans = Array.from(layer.querySelectorAll('span'));

        const runs = spans
            .map((span, index) => {
                const text = span.textContent?.trim() ?? '';
                if (!text) return null;

                const rect = span.getBoundingClientRect();
                const left = rect.left - containerRect.left;
                const top = rect.top - containerRect.top;
                const width = rect.width;
                const height = rect.height;

                if (width < 1 || height < 1) return null;

                const fontSizePx = Number.parseFloat(window.getComputedStyle(span).fontSize) || 12;

                return {
                    id: `${pageIndex}-dom-${index}-${Math.round(left)}-${Math.round(top)}`,
                    pageIndex,
                    text,
                    viewportRect: {
                        left,
                        top,
                        width,
                        height,
                    },
                    pdfRect: {
                        x: left / scale,
                        y: meta.height - (top + height) / scale,
                        width: width / scale,
                        height: height / scale,
                    },
                    fontSize: Math.max(8, fontSizePx / scale),
                };
            })
            .filter((run): run is NonNullable<typeof run> => run !== null);

        const textIndex: PageTextIndex = {
            pageIndex,
            pageWidth: meta.width,
            pageHeight: meta.height,
            runs,
        };

        setPageTextIndex((prev) => ({
            ...prev,
            [pageIndex]: textIndex,
        }));
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
                            setPageTextIndex({});
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
                                Mode: <strong>{tool === 'edit-text' ? 'Edit Text' : 'Add Text'}</strong>. Click directly on the PDF preview.
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
                                            onClick={(event) => {
                                                if (tool === 'add-text') {
                                                    handleAddTextAtClick(event, index);
                                                    return;
                                                }
                                                handleEditTextAtClick(event, index);
                                            }}
                                            style={{ cursor: tool === 'add-text' ? 'crosshair' : 'text' }}
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
                                                }}
                                                onRenderTextLayerSuccess={() => {
                                                    window.requestAnimationFrame(() => {
                                                        collectTextLayerFromDom(index);
                                                    });
                                                }}
                                            />

                                            {activeInlineEditor && activeInlineEditor.pageIndex === index && (
                                                <textarea
                                                    ref={inlineEditorRef}
                                                    value={activeInlineEditor.value}
                                                    onMouseDown={(event) => event.stopPropagation()}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onChange={(event) => {
                                                        setActiveInlineEditor((prev) => {
                                                            if (!prev) return prev;
                                                            return { ...prev, value: event.target.value };
                                                        });
                                                    }}
                                                    onBlur={() => {
                                                        void commitInlineEdit();
                                                    }}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter' && !event.shiftKey) {
                                                            event.preventDefault();
                                                            void commitInlineEdit();
                                                        }
                                                        if (event.key === 'Escape') {
                                                            setActiveInlineEditor(null);
                                                        }
                                                    }}
                                                    className="absolute z-20 resize-none border rounded px-1 py-0.5"
                                                    style={{
                                                        left: `${activeInlineEditor.left}px`,
                                                        top: `${activeInlineEditor.top}px`,
                                                        width: `${activeInlineEditor.width}px`,
                                                        minHeight: `${activeInlineEditor.height}px`,
                                                        fontSize: `${activeInlineEditor.fontSize * scale}px`,
                                                        lineHeight: 1.2,
                                                        background: 'rgba(255,255,255,0.95)',
                                                        color: '#111827',
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
