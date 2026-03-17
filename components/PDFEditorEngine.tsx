"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { avniEngine } from '../src/engine/core/Orchestrator';
import { PDFEditProcessor } from '../src/engine/processors/PDFEditProcessor';
import { AvniDocument } from '../src/engine/types';
import { PDFEditOperation } from '../src/engine/editor/types';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-workers/pdf.worker.min.js';

type EditorTool = 'add-text' | 'edit-text';

type PageMeta = {
    width: number;
    height: number;
};

type TextBox = {
    left: number;
    top: number;
    width: number;
    height: number;
    text: string;
};

type TextItemLike = {
    str?: string;
    transform?: number[];
    width?: number;
    height?: number;
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
    const [textBoxes, setTextBoxes] = useState<Record<number, TextBox[]>>({});

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

    const handlePageClick = async (
        event: React.MouseEvent<HTMLDivElement>,
        pageIndex: number
    ) => {
        if (!activeBlob || tool !== 'add-text') return;

        const meta = pageMeta[pageIndex];
        if (!meta) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const pdfX = clickX / scale;
        const pdfY = meta.height - clickY / scale;

        await runOperation({
            type: 'insert-text',
            pageIndex,
            text: insertText,
            x: pdfX,
            y: pdfY,
            size: insertFontSize,
        });
    };

    const handleReplaceText = async (pageIndex: number, box: TextBox) => {
        if (tool !== 'edit-text') return;

        const newText = window.prompt('Replace selected text with:', box.text);
        if (!newText || !newText.trim()) return;

        const meta = pageMeta[pageIndex];
        if (!meta) return;

        const pdfX = box.left / scale;
        const pdfY = meta.height - (box.top + box.height) / scale;
        const pdfW = box.width / scale;
        const pdfH = Math.max(8, box.height / scale);

        await runOperation({
            type: 'replace-text',
            pageIndex,
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
            newText: newText.trim(),
            size: pdfH * 0.8,
        });
    };

    const collectTextLayer = (pageIndex: number, items: unknown[]) => {
        const boxes: TextBox[] = [];

        for (const item of items as TextItemLike[]) {
            if (!item?.str || !item.transform) continue;

            const left = item.transform[4] ?? 0;
            const height = Math.max(8, item.height ?? 10);
            const top = (item.transform[5] ?? 0) - height;
            const width = Math.max(3, item.width ?? item.str.length * 6);

            boxes.push({
                left,
                top,
                width,
                height,
                text: item.str,
            });
        }

        setTextBoxes((prev) => ({
            ...prev,
            [pageIndex]: boxes,
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
                            setTextBoxes({});
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
                                    Edit Text (click existing text)
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
                                    Add Text (click anywhere)
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
                                <input type="number" value={pageOpIndex} onChange={(e) => setPageOpIndex(Number(e.target.value))} className="p-2 border rounded" placeholder="Page index" />
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
                                            onClick={(event) => handlePageClick(event, index)}
                                            style={{ cursor: tool === 'add-text' ? 'crosshair' : 'default' }}
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
                                                onGetTextSuccess={(data) => collectTextLayer(index, data.items as unknown[])}
                                            />

                                            {tool === 'edit-text' &&
                                                (textBoxes[index] ?? []).map((box, boxIndex) => (
                                                    <button
                                                        key={`${index}-${boxIndex}-${box.left}-${box.top}`}
                                                        type="button"
                                                        title={`Edit: ${box.text}`}
                                                        className="absolute"
                                                        style={{
                                                            left: `${box.left}px`,
                                                            top: `${box.top}px`,
                                                            width: `${box.width}px`,
                                                            height: `${box.height}px`,
                                                            background: 'transparent',
                                                            border: 'none',
                                                            outline: 'none',
                                                            cursor: 'text',
                                                        }}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleReplaceText(index, box);
                                                        }}
                                                    />
                                                ))}
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
