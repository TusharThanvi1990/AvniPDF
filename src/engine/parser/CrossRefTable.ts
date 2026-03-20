/**
 * Cross-Reference Table Parser
 * 
 * Reads the xref table at the end of a PDF file.
 * PDFs have an xref that tells you where each object is located in the file.
 * 
 * PDF spec: section 3.4 (Cross-reference streams)
 * PDFs can have either:
 * 1. Traditional xref tables (simple text format)
 * 2. XRef streams (PDF 1.5+, compressed binary format)
 */

import { XRefEntry, PDFDict, PDFObject, PDFArray, isDict, isStream, ref } from './types';

export interface CrossRefInfo {
    entries: Map<number, XRefEntry>; // objNum -> entry
    trailer: PDFDict;
    prevXRefOffset: number | null; // offset of previous xref (for incremental updates)
}

/**
 * Find the xref offset by searching backward from EOF
 * PDFs end with: "%%EOF" and before that is "startxref <offset>"
 */
export function findXRefOffset(bytes: Uint8Array): number {
    const eof = bytes.length;
    const searchWindow = Math.min(2048, eof);
    const text = new TextDecoder().decode(bytes.subarray(eof - searchWindow, eof));

    const match = text.match(/startxref\s+(\d+)/);
    if (!match) {
        console.error('[ERROR] startxref pattern not found');
        throw new Error('PDF missing startxref offset');
    }

    const offset = parseInt(match[1], 10);
    console.log('[SUCCESS] Found xref offset:', offset);
    return offset;
}

/**
 * Parse traditional xref table
 * Format:
 * xref
 * 0 6       <- subsection: object 0, count 6
 * 0000000000 65535 f
 * 0000000015 00000 n
 * 0000000197 00000 n
 * ...
 */
function parseTraditionalXRef(bytes: Uint8Array, offset: number): CrossRefInfo {
    const decoder = new TextDecoder();
    const text = decoder.decode(bytes.subarray(offset));

    // Find "xref" keyword
    const xrefIndex = text.indexOf('xref');
    if (xrefIndex === -1) {
        throw new Error('Invalid xref table - xref keyword not found');
    }

    const entries = new Map<number, XRefEntry>();
    const lines = text.substring(xrefIndex).split(/[\r\n]+/);
    
    let i = 1; // Skip "xref" line
    let subsectionCount = 0;
    let totalEntriesRead = 0;

    // Parse xref subsections
    while (i < lines.length) {
        const line = lines[i].trim();

        // Stop at trailer
        if (line.toLowerCase().startsWith('trailer')) {
            break;
        }

        // Skip empty lines
        if (!line) {
            i++;
            continue;
        }

        // Parse subsection header: "startObjNum count"
        const subsectionMatch = line.match(/^(\d+)\s+(\d+)$/);
        if (subsectionMatch) {
            subsectionCount++;
            const startObj = parseInt(subsectionMatch[1], 10);
            const count = parseInt(subsectionMatch[2], 10);

            // Read count entries
            for (let j = 0; j < count; j++) {
                i++;
                if (i >= lines.length) {
                    console.warn(`[WARN] Expected ${count} xref entries, only got ${j}`);
                    break;
                }

                const entryLine = lines[i];
                // Entry format: "0000000000 65535 f" or "0000000015 00000 n"
                const match = entryLine.match(/^(\d{10})\s+(\d{5})\s+([nf])/);
                if (match) {
                    const entryOffset = parseInt(match[1], 10);
                    const genNum = parseInt(match[2], 10);
                    const inUse = match[3] === 'n';

                    entries.set(startObj + j, {
                        type: 'uncompressed',
                        offset: entryOffset,
                        genNum,
                        inUse,
                    });
                    totalEntriesRead++;
                } else {
                    console.warn(`[WARN] Malformed xref entry at line ${i}: "${entryLine}"`);
                }
            }
        }

        i++;
    }

    if (entries.size === 0) {
        throw new Error('No valid xref entries found in xref table');
    }

    // Parse trailer dictionary (will be populated later by object parser)
    const trailer: PDFDict = {
        type: 'dict',
        entries: new Map(),
    };

    // Find previous xref offset if present
    const prevMatch = text.match(/\/Prev\s+(\d+)/);
    const prevXRefOffset = prevMatch ? parseInt(prevMatch[1], 10) : null;

    console.log(`[SUCCESS] Parsed xref: ${entries.size} entries in ${subsectionCount} subsection(s), prev=${prevXRefOffset ?? 'none'}`);

    return { entries, trailer, prevXRefOffset };
}

/**
 * Main entry point: parse xref at given offset
 * Handles both traditional xref tables and xref streams (PDF 1.5+)
 */
export function parseXRef(bytes: Uint8Array, offset: number): CrossRefInfo {
    const decoder = new TextDecoder();
    const text = decoder.decode(bytes.subarray(offset, Math.min(offset + 200, bytes.length)));

    // Check if it's a traditional xref (starts with "xref")
    if (text.includes('xref')) {
        console.log('[DEBUG] Detected traditional xref table');
        return parseTraditionalXRef(bytes, offset);
    }
    
    // Check if it's an xref stream (indirect object with /Type /XRef)
    if (text.match(/^\d+\s+\d+\s+obj/) && text.includes('/Type') && text.includes('/XRef')) {
        console.log('[DEBUG] Detected xref stream (PDF 1.5+)');
        return parseXRefStream(bytes, offset);
    }
    
    throw new Error(`Unknown xref format at offset ${offset}`);
}

/**
 * Parse xref stream object (PDF 1.5+)
 * Format: NNN MMM obj
 * << /Type /XRef /Size N /W [...] /Index [...] >>
 * stream
 * binary data
 * endstream
 * endobj
 */
function parseXRefStream(bytes: Uint8Array, offset: number): CrossRefInfo {
    const decoder = new TextDecoder();
    const text = decoder.decode(bytes.subarray(offset, Math.min(offset + 16384, bytes.length)));

    // Parse object header: "NNN MMM obj"
    const objMatch = text.match(/^(\d+)\s+(\d+)\s+obj/);
    if (!objMatch) throw new Error('Invalid xref stream object header');

    // Extract dictionary
    const dictMatch = text.match(/<<([\s\S]*?)>>/);
    if (!dictMatch) throw new Error('XRef stream missing dictionary');

    const dictText = dictMatch[1];
    
    // Parse /Size (total number of objects)
    const sizeMatch = dictText.match(/\/Size\s+(\d+)/);
    const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;

    // Parse /W array [typeWidth offsetWidth prevWidth]
    const wMatch = dictText.match(/\/W\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s*\]/);
    if (!wMatch) throw new Error('XRef stream missing /W array');
    
    const typeWidth = parseInt(wMatch[1], 10);
    const offsetWidth = parseInt(wMatch[2], 10);
    const prevWidth = parseInt(wMatch[3], 10);
    const entrySize = typeWidth + offsetWidth + prevWidth;

    console.log(`[DEBUG] XRef stream: W=[${typeWidth},${offsetWidth},${prevWidth}], Size=${size}`);

    // Parse /Index array [startNum count ...]
    const indexMatch = dictText.match(/\/Index\s*\[\s*((?:\d+\s+)+)\]/);
    const indexPairs: number[] = [];
    if (indexMatch) {
        const indexStr = indexMatch[1].trim().split(/\s+/);
        for (const num of indexStr) {
            indexPairs.push(parseInt(num, 10));
        }
    } else {
        // Default: all objects from 0 to Size
        indexPairs.push(0, size);
    }
    
    let totalEntries = 0;
    for (let i = 0; i < indexPairs.length; i += 2) {
        totalEntries += indexPairs[i + 1];
    }
    console.log(`[DEBUG] XRef stream Index: ${JSON.stringify(indexPairs)}, total entries=${totalEntries}, entry size=${entrySize} bytes`);

    // Find stream data - work with bytes directly to preserve binary data
    const streamKeywordStart = text.indexOf('stream');
    if (streamKeywordStart === -1) throw new Error('XRef stream missing stream keyword');
    
    // Convert text offset to byte offset
    const streamKeywordBytes = text.substring(0, streamKeywordStart);
    const byteOffsetOfStreamKeyword = new TextEncoder().encode(streamKeywordBytes).length;
    
    // Skip "stream" (6 bytes) and find actual data start
    let dataByteOffset = byteOffsetOfStreamKeyword + 6;
    
    // Skip LF or CRLF after "stream"
    while (dataByteOffset < bytes.length && (bytes[dataByteOffset] === 0x0D || bytes[dataByteOffset] === 0x0A)) {
        dataByteOffset++;
    }

    // Find "endstream" keyword
    const endstreamText = text.indexOf('endstream', streamKeywordStart);
    if (endstreamText === -1) throw new Error('XRef stream missing endstream');
    
    const endstreamBytesPrefix = text.substring(0, endstreamText);
    const byteOffsetOfEndstream = new TextEncoder().encode(endstreamBytesPrefix).length;

    // Extract binary stream data directly from original bytes
    const streamBytes = bytes.subarray(dataByteOffset, byteOffsetOfEndstream);
    
    // Trim trailing whitespace from the extracted stream
    let streamEnd = streamBytes.length;
    while (streamEnd > 0 && (streamBytes[streamEnd - 1] === 0x0D || streamBytes[streamEnd - 1] === 0x0A || streamBytes[streamEnd - 1] === 0x20)) {
        streamEnd--;
    }
    const trimmedStreamBytes = streamBytes.subarray(0, streamEnd);

    console.log(`[DEBUG] XRef stream data: ${trimmedStreamBytes.length} bytes extracted, expected ${totalEntries * entrySize} bytes`);

    // Parse entries
    const entries = new Map<number, XRefEntry>();
    let byteOffset = 0;
    
    for (let i = 0; i < indexPairs.length; i += 2) {
        const startObjNum = indexPairs[i];
        const count = indexPairs[i + 1];

        for (let j = 0; j < count; j++) {
            if (byteOffset + entrySize > trimmedStreamBytes.length) {
                console.warn(`[WARN] XRef stream: insufficient data for entry ${startObjNum + j} (need ${entrySize} bytes, have ${trimmedStreamBytes.length - byteOffset})`);
                break;
            }

            // Read entry bytes
            let pos = byteOffset;
            
            // Type field
            let typeVal = 0;
            for (let k = 0; k < typeWidth; k++) {
                typeVal = (typeVal << 8) | (trimmedStreamBytes[pos] ?? 0);
                pos++;
            }

            // Offset or stream number field
            let field2 = 0;
            for (let k = 0; k < offsetWidth; k++) {
                field2 = (field2 << 8) | (trimmedStreamBytes[pos] ?? 0);
                pos++;
            }

            // Generation or index field
            let field3 = 0;
            for (let k = 0; k < prevWidth; k++) {
                field3 = (field3 << 8) | (trimmedStreamBytes[pos] ?? 0);
                pos++;
            }

            const objNum = startObjNum + j;

            if (typeVal === 0) {
                // Type 0: Free object
                entries.set(objNum, {
                    type: 'uncompressed',
                    offset: 0,
                    genNum: field3,
                    inUse: false,
                });
            } else if (typeVal === 1) {
                // Type 1: Uncompressed object at file offset
                entries.set(objNum, {
                    type: 'uncompressed',
                    offset: field2,
                    genNum: field3,
                    inUse: true,
                });
            } else if (typeVal === 2) {
                // Type 2: Compressed object in object stream
                entries.set(objNum, {
                    type: 'compressed',
                    streamNum: field2,
                    indexNum: field3,
                });
            }

            byteOffset += entrySize;
        }
    }

    // Extract /Prev if present (previous xref offset)
    const prevMatch = dictText.match(/\/Prev\s+(\d+)/);
    const prevXRefOffset = prevMatch ? parseInt(prevMatch[1], 10) : null;

    // Extract /Root if present
    const rootMatch = dictText.match(/\/Root\s+(\d+)\s+(\d+)\s+R/);

    const trailer: PDFDict = {
        type: 'dict',
        entries: new Map(),
    };

    if (rootMatch) {
        const rootObjNum = parseInt(rootMatch[1], 10);
        const rootGenNum = parseInt(rootMatch[2], 10);
        trailer.entries.set('Root', ref(rootObjNum, rootGenNum));
    }

    trailer.entries.set('Size', size);

    console.log(`[SUCCESS] Parsed xref stream: ${entries.size} entries, prev=${prevXRefOffset ?? 'none'}`);

    return { entries, trailer, prevXRefOffset };
}

/**
 * Parse all xref tables back to the original
 * (PDFs can have multiple xref tables for incremental updates)
 */
export function parseAllXRefs(bytes: Uint8Array): CrossRefInfo[] {
    const allXRefs: CrossRefInfo[] = [];
    const seenOffsets = new Set<number>(); // Track offsets to prevent infinite loops

    let offset: number | null = findXRefOffset(bytes);
    
    while (offset !== null) {
        // Detect infinite loops - if we've seen this offset before, stop
        if (seenOffsets.has(offset)) {
            console.warn(`[WARN] Infinite loop detected at offset ${offset}, stopping xref chain traversal`);
            break;
        }
        
        seenOffsets.add(offset);

        try {
            const xref = parseXRef(bytes, offset);
            allXRefs.push(xref);
            offset = xref.prevXRefOffset;
        } catch (e) {
            console.error(`[ERROR] Failed to parse xref at offset ${offset}:`, e);
            break;
        }
    }

    return allXRefs;
}
