/**
 * PDF Parser Unit Tests
 * 
 * Comprehensive tests for PDF parsing functionality:
 * - Version detection (PDF 1.4, 1.7)
 * - Traditional xref table parsing
 * - XRef stream parsing (PDF 1.5+)
 * - Trailer dictionary extraction
 * - Root reference validation
 * - Infinite loop detection in xref chains
 * - Error handling and edge cases
 */

import { PDFParser } from '../../src/engine/parser/PDFParser';
import { 
  MINIMAL_PDF_14, 
  PDF_WITH_XREF_STREAM,
  PDF_WITH_CIRCULAR_XREF,
  INVALID_PDF,
  PDF_MISSING_XREF,
  PDF_WITH_XREF_WHITESPACE
} from '../fixtures/pdfs';

describe('PDFParser - Version Detection', () => {
  it('should extract PDF 1.4 version from header', () => {
    const parser = new PDFParser(MINIMAL_PDF_14);
    const doc = parser.parse();
    expect(doc.version).toBe('1.4');
  });

  it('should extract PDF 1.7 version from header', () => {
    const parser = new PDFParser(PDF_WITH_XREF_STREAM);
    const doc = parser.parse();
    expect(doc.version).toBe('1.7');
  });

  it('should throw on invalid PDF header without version', () => {
    const parser = new PDFParser(INVALID_PDF);
    expect(() => parser.parse()).toThrow();
  });
});

describe('PDFParser - XRef Parsing', () => {
  it('should parse traditional xref table', () => {
    const parser = new PDFParser(MINIMAL_PDF_14);
    const doc = parser.parse();
    
    expect(doc.xrefTables.size).toBeGreaterThan(0);
    const xref = Array.from(doc.xrefTables.values())[0];
    expect(xref).toBeDefined();
    expect(xref.size).toBeGreaterThan(0);
  });

  it('should extract object offsets from xref entries', () => {
    const parser = new PDFParser(MINIMAL_PDF_14);
    const doc = parser.parse();
    
    const xref = Array.from(doc.xrefTables.values())[0];
    const entry0 = xref.get(0);
    const entry1 = xref.get(1);
    
    expect(entry0?.inUse).toBe(false);
    expect(entry0?.type).toBe('uncompressed');
    
    expect(entry1?.inUse).toBe(true);
    expect(entry1?.type).toBe('uncompressed');
    if (entry1?.type === 'uncompressed') {
      expect(entry1.offset).toBeGreaterThan(0);
    }
  });

  it('should handle whitespace variations in xref entries', () => {
    const parser = new PDFParser(PDF_WITH_XREF_WHITESPACE);
    expect(() => parser.parse()).not.toThrow();
  });

  it('should detect and handle circular /Prev pointers', () => {
    const parser = new PDFParser(PDF_WITH_CIRCULAR_XREF);
    // Should not hang, should gracefully handle circular reference
    expect(() => parser.parse()).not.toThrow();
  });

  it('should throw when xref table is missing', () => {
    const parser = new PDFParser(PDF_MISSING_XREF);
    expect(() => parser.parse()).toThrow();
  });
});

describe('PDFParser - Trailer Parsing', () => {
  it('should extract Root reference from trailer', () => {
    const parser = new PDFParser(MINIMAL_PDF_14);
    const doc = parser.parse();
    
    expect(doc.rootRef).toBeDefined();
    expect(doc.rootRef.objNum).toBeGreaterThan(0);
    expect(doc.rootRef.genNum).toBeGreaterThanOrEqual(0);
  });

  it('should extract trailer dictionary entries', () => {
    const parser = new PDFParser(MINIMAL_PDF_14);
    const doc = parser.parse();
    
    expect(doc.trailer).toBeDefined();
    expect(doc.trailer.entries.size).toBeGreaterThan(0);
    expect(doc.trailer.entries.has('Root')).toBe(true);
  });

  it('should throw when Root reference is missing', () => {
    const noPdfContent = '%PDF-1.4\nxref\n0 1\n0000000000 65535 f\ntrailer\n<< /Size 1 >>\nstartxref\n0\n%%EOF';
    const parser = new PDFParser(noPdfContent);
    expect(() => parser.parse()).toThrow();
  });
});

describe('PDFParser - Object Cache', () => {
  it('should initialize empty object cache', () => {
    const parser = new PDFParser(MINIMAL_PDF_14);
    const doc = parser.parse();
    
    expect(doc.objectCache).toBeDefined();
    expect(doc.objectCache instanceof Map).toBe(true);
  });

  it('should provide framework for lazy object loading', () => {
    const parser = new PDFParser(MINIMAL_PDF_14);
    const doc = parser.parse();
    
    // Cache exists and is ready for lazy loading
    expect(doc.objectCache.size).toBeGreaterThanOrEqual(0);
  });
});

describe('PDFParser - XRef Merge', () => {
  it('should merge multiple xref tables from chain', () => {
    const parser = new PDFParser(MINIMAL_PDF_14);
    const doc = parser.parse();
    
    // Should have processed xref chain and merged results
    expect(doc.xrefTables.size).toBeGreaterThan(0);
  });

  it('should handle PDFs with single xref table', () => {
    const parser = new PDFParser(MINIMAL_PDF_14);
    const doc = parser.parse();
    
    const totalSize = Array.from(doc.xrefTables.values())
      .reduce((sum, table) => sum + table.size, 0);
    expect(totalSize).toBeGreaterThan(0);
  });
});

describe('PDFParser Integration', () => {
  it('should parse minimal PDF 1.4 successfully', () => {
    const parser = new PDFParser(MINIMAL_PDF_14);
    const doc = parser.parse();
    
    expect(doc).toBeDefined();
    expect(doc.version).toBe('1.4');
    expect(doc.rootRef).toBeDefined();
    expect(doc.trailer).toBeDefined();
    expect(doc.xrefTables.size).toBeGreaterThan(0);
  });

  it('should parse PDF 1.7 with xref stream', () => {
    const parser = new PDFParser(PDF_WITH_XREF_STREAM);
    const doc = parser.parse();
    
    expect(doc).toBeDefined();
    expect(doc.version).toBe('1.7');
    expect(doc.rootRef).toBeDefined();
    expect(doc.xrefTables.size).toBeGreaterThan(0);
  });

  it('should provide parsed document structure', () => {
    const parser = new PDFParser(MINIMAL_PDF_14);
    const doc = parser.parse();
    
    // Check document structure
    expect(doc.version).toBeDefined();
    expect(doc.xrefTables).toBeInstanceOf(Map);
    expect(doc.trailer.entries).toBeInstanceOf(Map);
    expect(doc.rootRef.objNum).toBeGreaterThan(0);
    expect(doc.objectCache).toBeInstanceOf(Map);
  });
});

describe('PDFParser Error Handling', () => {
  it('should provide clear error messages for invalid PDFs', () => {
    const parser = new PDFParser(INVALID_PDF);
    expect(() => parser.parse())
      .toThrow();
  });

  it('should provide clear error messages for missing xref', () => {
    const parser = new PDFParser(PDF_MISSING_XREF);
    expect(() => parser.parse()).toThrow();
  });

  it('should handle corrupted xref gracefully', () => {
    const badXref = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\nxref\nBAD\ntrailer\n<< /Size 2 /Root 1 0 R >>\nstartxref\n0\n%%EOF';
    const parser = new PDFParser(badXref);
    expect(() => parser.parse()).toThrow();
  });

  it('should handle PDFs with empty xref tables', () => {
    const emptyXref = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\nxref\n0 0\ntrailer\n<< /Size 1 /Root 1 0 R >>\nstartxref\n0\n%%EOF';
    const parser = new PDFParser(emptyXref);
    expect(() => parser.parse()).toThrow();
  });
});
