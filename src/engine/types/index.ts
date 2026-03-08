/**
 * Avni Engine Core Types
 * Defines the standard interfaces for document processing
 */

export type DocumentType = 'pdf' | 'docx' | 'image' | 'text' | 'csv';

export interface AvniDocument {
    id: string;
    name: string;
    blob: Blob;
    type: DocumentType;
    size: number;
    metadata: Record<string, any>;
    history: ProcessingStep[];
}

export interface ProcessingStep {
    taskId: string;
    processorName: string;
    timestamp: number;
    params: Record<string, any>;
}

export interface ProcessorResult {
    success: boolean;
    document: AvniDocument;
    error?: string;
    metrics?: {
        duration: number;
        originalSize: number;
        newSize: number;
    };
}

export interface IAvniProcessor {
    name: string;
    supportedTypes: DocumentType[];
    process(doc: AvniDocument, params: Record<string, any>): Promise<ProcessorResult>;
}

export interface PipelineConfig {
    tasks: {
        processorName: string;
        params: Record<string, any>;
    }[];
}
