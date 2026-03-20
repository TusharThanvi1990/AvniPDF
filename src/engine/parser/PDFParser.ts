/**
 * PDF Parser - Main Entry Point
 * 
 * Orchestrates the parsing pipeline:
 * 1. Find xref offset
 * 2. Parse cross-reference table(s)
 * 3. Create lazy-loaded object tree
 * 4. Return PDFDocument
 * 
 * Supports both compressed (xref stream) and uncompressed (traditional xref) formats.
 */

import { PDFDocument, PDFObject, PDFDict, PDFRef, XRefEntry, ref, isDict, isStream } from './types';
import { findXRefOffset, parseAllXRefs, CrossRefInfo } from './CrossRefTable';
import { readIndirectObject, readObject } from './ObjectReader';

/**
 * Main PDF Parser
 */
export class PDFParser {
    private bytes: Uint8Array;
    private document: PDFDocument | null = null;

    constructor(pdfBytes: Uint8Array) {
        this.bytes = pdfBytes;
    }

    /**
     * Main parse entry point
     */
    parse(): PDFDocument {
        if (this.document) return this.document;

        try {
            console.log('[INFO] Starting PDF parse...');

            // 1. Extract version
            const version = this.extractVersion();

            // 2. Find and parse xref tables
            const xrefTables = this.parseXRefTables();
            
            // Ensure we found at least one xref table
            if (xrefTables.length === 0) {
                throw new Error('No valid xref tables found in PDF');
            }

            // 3. Merge all xref entries (newer tables override older ones)
            const mergedXRef = new Map<number, XRefEntry>();
            for (let i = xrefTables.length - 1; i >= 0; i--) {
                for (const [objNum, entry] of xrefTables[i].entries) {
                    if (!mergedXRef.has(objNum)) {
                        mergedXRef.set(objNum, entry);
                    }
                }
            }

            // 4. Extract root reference from trailer
            const trailer = xrefTables[0].trailer;
            const rootRef = this.extractRootRef(trailer, mergedXRef);

            // 5. Create document
            this.document = {
                rawBytes: this.bytes,
                xrefTables: new Map([[0, mergedXRef]]),
                objectCache: new Map(),
                rootRef,
                trailer,
                version,
            };

            console.log('[SUCCESS] PDF parse complete. Version:', version, 'Objects:', mergedXRef.size);
            return this.document;
        } catch (error) {
            console.error('[ERROR] Parse failed:', error);
            throw error;
        }
    }

    /**
     * Extract PDF version from header
     * Format: %PDF-X.Y
     */
    private extractVersion(): string {
        const decoder = new TextDecoder();
        const header = decoder.decode(this.bytes.subarray(0, 20));
        const match = header.match(/%PDF-(\d+\.\d+)/);
        if (!match) throw new Error('Invalid PDF header - no %PDF-X.Y found');
        console.log('[SUCCESS] PDF Version:', match[1]);
        return match[1];
    }

    /**
     * Parse all xref tables (including previous versions for incremental updates)
     */
    private parseXRefTables(): CrossRefInfo[] {
        console.log('[DEBUG] Parsing xref tables...');
        try {
            // Use the robust parseAllXRefs from CrossRefTable module
            const xrefTables = parseAllXRefs(this.bytes);
            console.log('[SUCCESS] Parsed', xrefTables.length, 'xref table(s)');

            // Populate trailer for each xref (if not already populated by xref stream)
            for (let i = 0; i < xrefTables.length; i++) {
                // XRef streams already have trailer populated, but traditional xref tables need extraction
                if (xrefTables[i].trailer.entries.size === 0) {
                    console.log(`[DEBUG] Extracting trailer for traditional xref table ${i + 1}`);
                    xrefTables[i].trailer = this.extractTrailerDict(this.findXRefOffsetForTable(i));
                } else {
                    console.log(`[DEBUG] Trailer already populated for xref table ${i + 1} (${xrefTables[i].trailer.entries.size} entries)`);
                }
            }

            return xrefTables;
        } catch (error) {
            console.error('[ERROR] Failed to parse xref tables:', error);
            throw error;
        }
    }

    /**
     * Helper to find xref offset for a specific table (for trailer extraction)
     */
    private findXRefOffsetForTable(index: number): number {
        // For now, find the main xref - we'll refactor this later if needed
        try {
            return findXRefOffset(this.bytes);
        } catch (e) {
            console.error('[ERROR] Could not find xref offset:', e);
            throw e;
        }
    }

    /**
     * Extract trailer dictionary for traditional xref tables
     * (XRef streams already include trailer info in dictionary)
     */
    private extractTrailerDict(xrefOffset: number): PDFDict {
        const decoder = new TextDecoder();
        const text = decoder.decode(this.bytes.subarray(xrefOffset, Math.min(xrefOffset + 4096, this.bytes.length)));

        const trailerMatch = text.match(/trailer\s*<<[\s\S]*?>>/);
        if (!trailerMatch) {
            console.warn('[WARN] Trailer dictionary not found at offset', xrefOffset, '(probably xref stream)');
            return { type: 'dict', entries: new Map() };
        }

        // For now, return basic trailer with Root if we can find it
        const trailer: PDFDict = {
            type: 'dict',
            entries: new Map(),
        };

        // Extract Root reference
        const rootMatch = text.match(/\/Root\s+(\d+)\s+(\d+)\s+R/);
        if (rootMatch) {
            const objNum = parseInt(rootMatch[1], 10);
            const genNum = parseInt(rootMatch[2], 10);
            trailer.entries.set('Root', ref(objNum, genNum));
        }

        // Extract Size
        const sizeMatch = text.match(/\/Size\s+(\d+)/);
        if (sizeMatch) {
            trailer.entries.set('Size', parseInt(sizeMatch[1], 10));
        }

        return trailer;
    }

    /**
     * Extract root reference from trailer
     */
    private extractRootRef(trailer: PDFDict, xref: Map<number, XRefEntry>): PDFRef {
        const rootObj = trailer.entries.get('Root');
        if (!rootObj) {
            console.error('[ERROR] Trailer has no Root entry. Trailer entries:', Array.from(trailer.entries.keys()));
            throw new Error('Trailer missing /Root reference');
        }
        if (typeof rootObj !== 'object' || rootObj.type !== 'ref') {
            console.error('[ERROR] Root is not a reference object:', rootObj);
            throw new Error('Trailer /Root is not a valid reference');
        }
        return rootObj as PDFRef;
    }

    /**
     * Load an object by reference (lazy loading)
     * This is called by users of the parser to load specific objects
     */
    loadObject(ref: PDFRef): PDFObject {
        if (!this.document) throw new Error('Parse PDF first');

        const cacheKey = `${ref.objNum}.${ref.genNum}`;
        if (this.document.objectCache.has(cacheKey)) {
            return this.document.objectCache.get(cacheKey)!;
        }

        // Find object in xref tables
        const xref = this.document.xrefTables.get(0);
        if (!xref) throw new Error('No xref table found');

        const entry = xref.get(ref.objNum);
        if (!entry) throw new Error(`Object ${ref.objNum} not found in xref`);

        if (entry.type === 'uncompressed') {
            // Read object at offset
            const obj = this.readObjectAt(entry.offset);
            this.document.objectCache.set(cacheKey, obj);
            return obj;
        } else {
            // Compressed object in object stream
            throw new Error('Compressed objects not yet supported');
        }
    }

    /**
     * Read object at specific file offset
     */
    private readObjectAt(offset: number): PDFObject {
        // Find the next "obj" keyword after this offset
        const decoder = new TextDecoder();
        const searchText = decoder.decode(this.bytes.subarray(offset, Math.min(offset + 256, this.bytes.length)));

        const objMatch = searchText.match(/(\d+)\s+(\d+)\s+obj/);
        if (!objMatch) throw new Error('Object definition not found at offset ' + offset);

        // Create a tokenizer starting from this position
        const objStartOffset = offset + (searchText.indexOf(objMatch[0]) || 0);
        const objectBytes = this.bytes.subarray(objStartOffset);

        // Parse the object
        // For simplicity, we'll just read the content manually
        // In production, use a proper tokenizer
        const dataStr = new TextDecoder().decode(objectBytes.subarray(0, Math.min(500, objectBytes.length)));

        // Extract between obj and endobj
        const match = dataStr.match(/obj\s*([\s\S]*?)\s*endobj/);
        if (!match) throw new Error('Cannot parse object');

        // For now, return a placeholder
        // Full implementation would use the ObjectReader tokenizer
        return null;
    }
}

/**
 * Quick test function - verify parser can read PDF structure
 */
export function testParser(pdfBytes: Uint8Array): void {
    try {
        const parser = new PDFParser(pdfBytes);
        const doc = parser.parse();

        console.log(`✓ Parsed PDF version ${doc.version}`);
        console.log(`✓ Root reference: ${doc.rootRef.objNum} ${doc.rootRef.genNum} R`);
        console.log(`✓ Xref entries: ${doc.xrefTables.get(0)?.size}`);
    } catch (e) {
        console.error('Parse failed:', e);
    }
}
