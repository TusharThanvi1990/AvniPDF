/**
 * PDF Parser Types
 * 
 * Represents the in-memory object tree of a parsed PDF.
 * All PDFs are hierarchies of these objects.
 */

export type PDFRefId = { objNum: number; genNum: number };

/**
 * All possible PDF object types
 */
export type PDFObject =
    | null
    | boolean
    | number
    | string
    | PDFName
    | PDFArray
    | PDFDict
    | PDFStream
    | PDFRef;

/**
 * PDF Name object - always starts with /
 * Examples: /Type, /Font, /Contents
 */
export type PDFName = {
    type: 'name';
    value: string; // without leading /
};

/**
 * PDF Array - [ item1 item2 ... ]
 */
export type PDFArray = {
    type: 'array';
    items: PDFObject[];
};

/**
 * PDF Dictionary - << key1 value1 key2 value2 ... >>
 */
export type PDFDict = {
    type: 'dict';
    entries: Map<string, PDFObject>; // key is without leading /
};

/**
 * PDF Stream - binary data with associated dictionary
 * << dict >>
 * stream
 * ... binary data ...
 * endstream
 */
export type PDFStream = {
    type: 'stream';
    dict: PDFDict;
    data: Uint8Array; // decompressed if FlateDecode
};

/**
 * PDF Indirect Reference - R indirect object reference
 * Example: 5 0 R refers to object 5, generation 0
 */
export type PDFRef = {
    type: 'ref';
    objNum: number;
    genNum: number;
};

/**
 * Cross-reference table entry
 * Points to where an object starts in the file
 */
export type XRefEntry =
    | {
          type: 'uncompressed';
          offset: number; // byte offset in PDF file
          genNum: number;
          inUse: boolean; // 'n' = in use, 'f' = free
      }
    | {
          type: 'compressed';
          streamNum: number; // object number of object stream
          indexNum: number; // index within object stream
      };

/**
 * Parsed PDF document - the object tree
 */
export type PDFDocument = {
    // Raw file bytes (for later incremental writing)
    rawBytes: Uint8Array;

    // Cross-reference tables (may have multiple for incremental updates)
    xrefTables: Map<number, Map<number, XRefEntry>>; // [objNum][genNum] -> entry

    // Object cache (lazy-loaded)
    objectCache: Map<string, PDFObject>; // key = "objNum.genNum"

    // Root object (usually the Catalog)
    rootRef: PDFRef;

    // Trailer dictionary (end of PDF, contains root and xref info)
    trailer: PDFDict;

    // File format version (e.g., 1.4, 1.7)
    version: string;
};

/**
 * Helper to create a PDFName
 */
export const name = (n: string): PDFName => ({
    type: 'name',
    value: n.startsWith('/') ? n.slice(1) : n,
});

/**
 * Helper to create a PDFRef
 */
export const ref = (objNum: number, genNum = 0): PDFRef => ({
    type: 'ref',
    objNum,
    genNum,
});

/**
 * Helper to check if object is a dict
 */
export const isDict = (obj: PDFObject): obj is PDFDict => typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'dict';

/**
 * Helper to check if object is a stream
 */
export const isStream = (obj: PDFObject): obj is PDFStream => typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'stream';

/**
 * Helper to check if object is a ref
 */
export const isRef = (obj: PDFObject): obj is PDFRef => typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'ref';

/**
 * Helper to check if object is an array
 */
export const isArray = (obj: PDFObject): obj is PDFArray => typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'array';
