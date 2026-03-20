"use client";

import React, { useState } from 'react';
import { PDFParser } from '../../engine/parser';

type ParseResult = {
    version: string;
    rootRef: { objNum: number; genNum: number } | null;
    xrefSize: number;
    trailerEntries: number;
    status: 'success' | 'error';
    message: string;
    rawData?: {
        version: string;
        rootObjNum: number;
        rootGenNum: number;
        xrefCount: number;
        trailerKeyCount: number;
    };
};

export default function ParserTestPage() {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<ParseResult | null>(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null);
        }
    };

    const testParser = async () => {
        if (!file) {
            setResult({
                version: '',
                rootRef: null,
                xrefSize: 0,
                trailerEntries: 0,
                status: 'error',
                message: 'Please select a PDF file',
            });
            return;
        }

        setLoading(true);
        try {
            // Read file as bytes
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);

            // Parse PDF
            const parser = new PDFParser(bytes);
            const doc = parser.parse();

            // Get xref size
            const xref = doc.xrefTables.get(0);
            const xrefSize = xref?.size ?? 0;

            setResult({
                version: doc.version,
                rootRef: doc.rootRef,
                xrefSize,
                trailerEntries: doc.trailer.entries.size,
                status: 'success',
                message: 'PDF parsed successfully! ✅',
                rawData: {
                    version: doc.version,
                    rootObjNum: doc.rootRef.objNum,
                    rootGenNum: doc.rootRef.genNum,
                    xrefCount: xrefSize,
                    trailerKeyCount: doc.trailer.entries.size,
                },
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setResult({
                version: '',
                rootRef: null,
                xrefSize: 0,
                trailerEntries: 0,
                status: 'error',
                message: `Parse failed: ${errorMessage}`,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-8 bg-[var(--content-bg)] text-[var(--content-text)]">
            <div className="max-w-2xl mx-auto space-y-6">
                <h1 className="text-4xl font-bold">🧪 PDF Parser Test Page</h1>

                <p className="text-sm opacity-75">
                    Upload a PDF file to test the parser (Module 1). This verifies:
                </p>
                <ul className="text-sm opacity-70 list-disc list-inside space-y-1">
                    <li>PDF version detection</li>
                    <li>Xref table parsing</li>
                    <li>Trailer extraction</li>
                    <li>Root reference finding</li>
                </ul>

                {/* File Upload Section */}
                <div className="card space-y-4 p-6 border rounded">
                    <h2 className="text-xl font-semibold">Upload PDF</h2>

                    <div className="flex flex-col gap-3">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="p-3 border rounded bg-[var(--card-bg)] cursor-pointer file:cursor-pointer file:bg-[var(--hero-bg)] file:text-[var(--hero-text)] file:border-0 file:px-4 file:py-2 file:rounded"
                        />

                        {file && (
                            <p className="text-sm opacity-75">
                                Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                            </p>
                        )}

                        <button
                            onClick={testParser}
                            disabled={!file || loading}
                            className="px-6 py-3 rounded font-semibold transition"
                            style={{
                                background: file && !loading ? 'var(--hero-bg)' : 'var(--card-border, rgba(127,127,127,0.4))',
                                color: file && !loading ? 'var(--hero-text)' : 'var(--card-text)',
                                cursor: file && !loading ? 'pointer' : 'not-allowed',
                                opacity: file && !loading ? 1 : 0.5,
                            }}
                        >
                            {loading ? 'Parsing...' : 'Test Parser'}
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                {result && (
                    <div
                        className="card space-y-4 p-6 border rounded"
                        style={{
                            borderColor: result.status === 'success' ? '#10b981' : '#ef4444',
                            background: result.status === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                        }}
                    >
                        <h2 className="text-xl font-semibold">
                            {result.status === 'success' ? '✅ Success' : '❌ Error'}
                        </h2>

                        <p className="text-sm">{result.message}</p>

                        {result.status === 'success' && result.rawData && (
                            <div className="space-y-3 bg-[var(--card-bg)] p-4 rounded text-sm font-mono">
                                <div className="flex justify-between">
                                    <span>PDF Version:</span>
                                    <strong style={{ color: '#3b82f6' }}>v{result.rawData.version}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Root Reference:</span>
                                    <strong style={{ color: '#3b82f6' }}>
                                        {result.rawData.rootObjNum} {result.rawData.rootGenNum} R
                                    </strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Xref Entries Found:</span>
                                    <strong style={{ color: '#3b82f6' }}>{result.rawData.xrefCount}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span>Trailer Keys:</span>
                                    <strong style={{ color: '#3b82f6' }}>{result.rawData.trailerKeyCount}</strong>
                                </div>
                            </div>
                        )}

                        {result.status === 'error' && (
                            <div className="bg-[var(--card-bg)] p-4 rounded text-sm" style={{ color: '#ef4444' }}>
                                <p className="font-mono text-xs">{result.message}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Info Section */}
                <div className="card space-y-3 p-6 border rounded opacity-75">
                    <h3 className="font-semibold">How to Test</h3>
                    <ol className="text-sm space-y-2 list-decimal list-inside">
                        <li>Click "Upload" and select any PDF file</li>
                        <li>Click "Test Parser" button</li>
                        <li>If successful, you'll see the parsed PDF data</li>
                        <li>If it fails, you'll see the error message</li>
                    </ol>

                    <h3 className="font-semibold pt-2">What This Tests</h3>
                    <p className="text-sm">
                        This page tests <strong>Module 1: PDF Parser</strong> - the foundation layer that reads PDF structure (version, xref table, object locations).
                    </p>
                </div>
            </div>
        </div>
    );
}
