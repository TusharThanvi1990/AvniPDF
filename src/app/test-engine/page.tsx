'use client';

import React, { useState, useEffect } from 'react';
import { avniEngine } from '../../engine/core/Orchestrator';
import { PDFCompressor } from '../../engine/processors/PDFCompressor';
import { AvniDocument, ProcessorResult } from '../../engine/types';
import { motion } from 'framer-motion';

export default function TestEnginePage() {
    const [file, setFile] = useState<File | null>(null);
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [results, setResults] = useState<ProcessorResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [compressionLevel, setCompressionLevel] = useState(50);

    // Initialize Engine in browser
    useEffect(() => {
        // Register the PDFCompressor tool
        avniEngine.registerProcessor(new PDFCompressor());
        setIsEngineReady(true);
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResults([]); // Clear previous results
        }
    };

    const runTest = async () => {
        if (!file || !isEngineReady) return;

        setIsProcessing(true);
        try {
            // 1. Convert Browser File to AvniDocument
            const initialDoc: AvniDocument = {
                id: crypto.randomUUID(),
                name: file.name,
                blob: file,
                type: 'pdf',
                size: file.size,
                metadata: {
                    lastModified: file.lastModified
                },
                history: []
            };

            // 2. Run the Pipeline! (This is what we'll extend later)
            const pipelineResults = await avniEngine.runPipeline(initialDoc, {
                tasks: [
                    {
                        processorName: 'pdf-compressor',
                        params: { level: compressionLevel }
                    }
                ]
            });

            setResults(pipelineResults);
        } catch (error) {
            console.error('Engine test failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadResult = (doc: AvniDocument) => {
        const url = URL.createObjectURL(doc.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `avni-result-${doc.name}`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen p-8 bg-[var(--content-bg)]">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="text-center">
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--footer-link)' }}>
                        Avni Engine Laboratory 🧪
                    </h1>
                    <p className="text-[var(--footer-muted)]">Testing orchestrator and micro-tasks</p>
                </header>

                <section className="card p-6 space-y-6">
                    <div className="flex flex-col gap-4">
                        <label className="font-semibold" style={{ color: 'var(--footer-link)' }}>
                            1. Upload Sample PDF
                        </label>
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileUpload}
                            className="p-2 border rounded-lg"
                        />
                    </div>

                    {file && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex flex-col gap-2">
                                <label className="font-semibold" style={{ color: 'var(--footer-link)' }}>
                                    2. Configure Processor (pdf-compressor)
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="10"
                                        max="90"
                                        value={compressionLevel}
                                        onChange={(e) => setCompressionLevel(Number(e.target.value))}
                                        className="flex-1 accent-[var(--footer-link)]"
                                    />
                                    <span className="font-mono">{compressionLevel}% Quality</span>
                                </div>
                            </div>

                            <motion.button
                                onClick={runTest}
                                disabled={isProcessing}
                                className="w-full py-3 bg-[var(--hero-bg)] text-white rounded-xl font-bold shadow-lg"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {isProcessing ? 'Engine Processing...' : 'Execute Avni Pipeline ⚙️'}
                            </motion.button>
                        </div>
                    )}
                </section>

                {results.length > 0 && (
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold px-2">Pipeline Execution History</h2>
                        {results.map((res, i) => (
                            <div key={i} className="card p-4 border-l-4 border-green-500 flex justify-between items-center">
                                <div className="space-y-1">
                                    <p className="font-bold text-lg">{res.document.history[i]?.processorName}</p>
                                    <p className="text-sm text-[var(--footer-muted)]">
                                        Duration: {res.metrics?.duration}ms |
                                        Size: {(res.metrics!.originalSize / 1024).toFixed(1)}KB → {(res.metrics!.newSize / 1024).toFixed(1)}KB
                                    </p>
                                </div>
                                <button
                                    onClick={() => downloadResult(res.document)}
                                    className="px-4 py-2 bg-[var(--footer-link)] text-white rounded-lg text-sm"
                                >
                                    Download Output
                                </button>
                            </div>
                        ))}
                    </section>
                )}
            </div>
        </div>
    );
}
