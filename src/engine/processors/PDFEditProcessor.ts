import { PDFEditSession } from '../editor/PDFEditSession';
import { PDFEditOperation } from '../editor/types';
import {
    AvniDocument,
    IAvniProcessor,
    ProcessingStep,
    ProcessorResult,
} from '../types';

export class PDFEditProcessor implements IAvniProcessor {
    name = 'pdf-editor-core';
    supportedTypes = ['pdf' as const];

    async process(doc: AvniDocument, params: Record<string, unknown>): Promise<ProcessorResult> {
        try {
            const operations = (params.operations as PDFEditOperation[] | undefined) ?? [];

            if (operations.length === 0) {
                return {
                    success: false,
                    document: doc,
                    error: 'No edit operations were provided.',
                };
            }

            const session = await PDFEditSession.fromAvniDocument(doc);
            await session.applyOperations(operations);
            const editedBlob = await session.toBlob();

            const step: ProcessingStep = {
                taskId: crypto.randomUUID(),
                processorName: this.name,
                timestamp: Date.now(),
                params,
            };

            return {
                success: true,
                document: {
                    ...doc,
                    blob: editedBlob,
                    size: editedBlob.size,
                    history: [...doc.history, step],
                },
                metrics: {
                    duration: 0,
                    originalSize: doc.size,
                    newSize: editedBlob.size,
                },
            };
        } catch (error: unknown) {
            return {
                success: false,
                document: doc,
                error: error instanceof Error ? error.message : 'Unknown PDF edit failure',
            };
        }
    }
}
