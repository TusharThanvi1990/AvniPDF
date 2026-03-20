/**
 * PDF Parser Module
 * 
 * Main export for the PDF parsing subsystem.
 * 
 * Use cases:
 * 1. Parse raw PDF bytes: const parser = new PDFParser(bytes); const doc = parser.parse();
 * 2. Load objects lazily: const obj = parser.loadObject(ref(1, 0));
 * 3. Access xref tables: const xref = doc.xrefTables.get(0);
 */

export { PDFParser, testParser } from './PDFParser';
export { findXRefOffset, parseXRef, parseAllXRefs, type CrossRefInfo } from './CrossRefTable';
export { readObject, readIndirectObject } from './ObjectReader';
export {
    type PDFObject,
    type PDFDict,
    type PDFArray,
    type PDFStream,
    type PDFRef,
    type PDFName,
    type PDFDocument,
    type XRefEntry,
    type PDFRefId,
    name,
    ref,
    isDict,
    isStream,
    isRef,
    isArray,
} from './types';
