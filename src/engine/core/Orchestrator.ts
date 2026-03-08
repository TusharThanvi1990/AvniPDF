import {
    AvniDocument,
    IAvniProcessor,
    PipelineConfig,
    ProcessorResult
} from '../types';

export class AvniOrchestrator {
    private processors: Map<string, IAvniProcessor> = new Map();

    /**
     * Register a new tool (processor) to the engine
     */
    registerProcessor(processor: IAvniProcessor) {
        this.processors.set(processor.name, processor);
        console.log(`[AvniEngine] Registered processor: ${processor.name}`);
    }

    /**
     * Run a sequence of tasks on a document
     */
    async runPipeline(
        initialDoc: AvniDocument,
        config: PipelineConfig
    ): Promise<ProcessorResult[]> {
        const results: ProcessorResult[] = [];
        let currentDoc = initialDoc;

        for (const task of config.tasks) {
            const processor = this.processors.get(task.processorName);

            if (!processor) {
                throw new Error(`Processor ${task.processorName} not found`);
            }

            console.log(`[AvniEngine] Executing ${processor.name}...`);

            const startTime = Date.now();
            const result = await processor.process(currentDoc, task.params);
            const endTime = Date.now();

            // Track metrics
            result.metrics = {
                duration: endTime - startTime,
                originalSize: currentDoc.size,
                newSize: result.document.size
            };

            results.push(result);

            if (!result.success) {
                console.error(`[AvniEngine] Pipeline failed at ${processor.name}: ${result.error}`);
                break;
            }

            // Pass the resulting document to the next task
            currentDoc = result.document;
        }

        return results;
    }

    getAvailableProcessors(): string[] {
        return Array.from(this.processors.keys());
    }
}

// Export a singleton instance
export const avniEngine = new AvniOrchestrator();
