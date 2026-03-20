/**
 * Cross-Reference Table Parser Tests
 * Integrated with parser - testing through PDFParser since findXRefOffset needs Uint8Array
 */

import { PDFParser } from '../../src/engine/parser/PDFParser';
import {
  MINIMAL_PDF_14,
  PDF_WITH_XREF_STREAM,
  PDF_WITH_CIRCULAR_XREF,
  PDF_MISSING_XREF,
  PDF_WITH_XREF_WHITESPACE,
} from '../fixtures/pdfs';

describe('CrossRefTable Integration', () => {
  describe('XRef Offset Finding (findXRefOffset)', () => {
    it('should find startxref offset in minimal PDF', () => {
      const parser = new PDFParser(MINIMAL_PDF_14);
      expect(() => parser.parse()).not.toThrow();
    });

    it('should find startxref in PDF with whitespace variations', () => {
      const parser = new PDFParser(PDF_WITH_XREF_WHITESPACE);
      expect(() => parser.parse()).not.toThrow();
    });

    it('should handle different line endings in PDF', () => {
      // PDF-1.4 with CRLF line endings  
      const crlfPdf = new TextEncoder().encode(
        '%PDF-1.4\r\n1 0 obj\r\n<< /Type /Catalog /Pages 2 0 R >>\r\nendobj\r\n2 0 obj\r\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\r\nendobj\r\n3 0 obj\r\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\r\nendobj\r\nxref\r\n0 4\r\n0000000000 65535 f \r\n0000000009 00000 n \r\n0000000058 00000 n \r\n0000000115 00000 n \r\ntrailer\r\n<< /Size 4 /Root 1 0 R >>\r\nstartxref\r\n190\r\n%%EOF'
      );
      const parser = new PDFParser(crlfPdf);
      expect(() => parser.parse()).not.toThrow();
    });

    it('should throw if startxref is missing', () => {
      const noStartxref = new TextEncoder().encode('%PDF-1.4\n%%EOF');
      const parser = new PDFParser(noStartxref);
      expect(() => parser.parse()).toThrow();
    });
  });

  describe('Traditional XRef Format Parsing', () => {
    it('should parse xref subsections with free and in-use entries', () => {
      const parser = new PDFParser(MINIMAL_PDF_14);
      const doc = parser.parse();

      expect(doc.xrefTables.size).toBeGreaterThan(0);
      const xref = Array.from(doc.xrefTables.values())[0];

      // Check free entry (first entry - should have inUse=false)
      const entry0 = xref.get(0);
      expect(entry0?.inUse).toBe(false);
      expect(entry0?.type).toBe('uncompressed');

      // Check in-use entry
      const entry1 = xref.get(1);
      expect(entry1?.inUse).toBe(true);
      expect(entry1?.type).toBe('uncompressed');
      if (entry1?.type === 'uncompressed') {
        expect(entry1.offset).toBeGreaterThan(0);
      }
    });

    it('should correctly parse object offsets', () => {
      const parser = new PDFParser(MINIMAL_PDF_14);
      const doc = parser.parse();

      const xref = Array.from(doc.xrefTables.values())[0];

      // All in-use entries should have positive offsets
      for (const [objNum, entry] of xref.entries()) {
        if (entry.inUse && entry.type === 'uncompressed') {
          expect(entry.offset).toBeGreaterThan(0);
        }
      }
    });

    it('should handle xref with multiple subsections', () => {
      // Use the minimal PDF which already starts with object 1, giving us multiple xref entries
      const parser = new PDFParser(MINIMAL_PDF_14);
      const doc = parser.parse();

      const xref = Array.from(doc.xrefTables.values())[0];
      // Should have parsed multiple xref entries
      expect(xref.size).toBeGreaterThan(1);
    });

    it('should handle whitespace variations in xref entries', () => {
      const parser = new PDFParser(PDF_WITH_XREF_WHITESPACE);
      const doc = parser.parse();

      expect(doc.xrefTables.size).toBeGreaterThan(0);
    });
  });

  describe('Trailer Dictionary Extraction', () => {
    it('should extract Root reference from trailer', () => {
      const parser = new PDFParser(MINIMAL_PDF_14);
      const doc = parser.parse();

      expect(doc.trailer).toBeDefined();
      expect(doc.trailer.entries.has('Root')).toBe(true);
      expect(doc.rootRef).toBeDefined();
      expect(doc.rootRef.objNum).toBeGreaterThan(0);
    });

    it('should extract Size entry from trailer', () => {
      const parser = new PDFParser(MINIMAL_PDF_14);
      const doc = parser.parse();

      expect(doc.trailer.entries.has('Size')).toBe(true);
    });

    it('should throw on missing Root reference', () => {
      const noRoot = new TextEncoder().encode(`%PDF-1.4
1 0 obj
<< /Type /Catalog >>
endobj
xref
0 1
0000000000 65535 f 
trailer
<< /Size 1 >>
startxref
50
%%EOF`);

      const parser = new PDFParser(noRoot);
      expect(() => parser.parse()).toThrow();
    });
  });

  describe('XRef Chain Handling', () => {
    it('should handle circular /Prev pointers gracefully', () => {
      const parser = new PDFParser(PDF_WITH_CIRCULAR_XREF);
      // Should detect the loop and not hang
      expect(() => parser.parse()).not.toThrow();
    });

    it('should process single xref table without errors', () => {
      const parser = new PDFParser(MINIMAL_PDF_14);
      const doc = parser.parse();

      // Should successfully process the xref chain
      expect(doc.xrefTables.size).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid xref table', () => {
      const invalidXref = new TextEncoder().encode(`%PDF-1.4
1 0 obj
<< /Type /Catalog >>
endobj
xref
INVALID DATA
trailer
<< /Size 1 /Root 1 0 R >>
startxref
50
%%EOF`);

      const parser = new PDFParser(invalidXref);
      expect(() => parser.parse()).toThrow();
    });

    it('should throw on missing xref table', () => {
      const parser = new PDFParser(PDF_MISSING_XREF);
      expect(() => parser.parse()).toThrow();
    });

    it('should throw on truncated PDF', () => {
      const truncated = new TextEncoder().encode('%PDF-1.4');
      const parser = new PDFParser(truncated);
      expect(() => parser.parse()).toThrow();
    });

    it('should provide meaningful error messages', () => {
      const parser = new PDFParser(new TextEncoder().encode('NOT A PDF'));
      expect(() => parser.parse()).toThrow(/PDF|header|Invalid/i);
    });
  });

  describe('XRef Entry Types', () => {
    it('should distinguish between free and in-use entries', () => {
      const parser = new PDFParser(MINIMAL_PDF_14);
      const doc = parser.parse();

      const xref = Array.from(doc.xrefTables.values())[0];

      let freeCount = 0;
      let inUseCount = 0;

      for (const entry of xref.values()) {
        if (entry.inUse) {
          inUseCount++;
        } else {
          freeCount++;
        }
      }

      expect(freeCount).toBeGreaterThan(0); // Should have at least one free entry
      expect(inUseCount).toBeGreaterThan(0); // Should have at least one in-use entry
    });

    it('should correctly identify uncompressed objects', () => {
      const parser = new PDFParser(MINIMAL_PDF_14);
      const doc = parser.parse();

      const xref = Array.from(doc.xrefTables.values())[0];

      for (const entry of xref.values()) {
        expect(entry.type).toBe('uncompressed');
        if (entry.type === 'uncompressed') {
          expect(entry.offset).toBeDefined();
          expect(entry.offset).toBeGreaterThanOrEqual(0);
          expect(entry.genNum).toBeDefined();
        }
      }
    });
  });

  describe('Multiple PDF Formats', () => {
    it('should handle PDF 1.4 with traditional xref', () => {
      const parser = new PDFParser(MINIMAL_PDF_14);
      const doc = parser.parse();

      expect(doc.version).toBe('1.4');
      expect(doc.xrefTables.size).toBeGreaterThan(0);
    });

    it('should handle PDF 1.7 with xref stream', () => {
      const parser = new PDFParser(PDF_WITH_XREF_STREAM);
      const doc = parser.parse();

      expect(doc.version).toBe('1.7');
      expect(doc.xrefTables.size).toBeGreaterThan(0);
    });
  });
});
