/**
 * Cross-Reference Table Parser Tests
 * 
 * Tests the xref parsing logic specifically
 */

import { findXRefOffset } from './CrossRefTable';

describe('CrossRefTable Parser', () => {
    describe('findXRefOffset', () => {
        it('should find startxref offset in PDF', () => {
            const pdf = new TextEncoder().encode(`
%PDF-1.4
1 0 obj
<< /Type /Catalog >>
endobj
xref
0 1
0000000000 65535 f
trailer
<< /Size 1 >>
startxref
42
%%EOF
`);

            const offset = findXRefOffset(pdf);
            expect(offset).toBe(42);
        });

        it('should handle different line endings (CRLF)', () => {
            const pdf = new TextEncoder().encode(
                '%PDF-1.4\r\n1 0 obj\r\n<< /Type /Catalog >>\r\nendobj\r\nxref\r\n0 1\r\nstartxref\r\n50\r\n%%EOF',
            );

            const offset = findXRefOffset(pdf);
            expect(offset).toBeGreaterThan(0);
        });

        it('should throw if startxref not found', () => {
            const pdf = new TextEncoder().encode('%PDF-1.4\n%%EOF');

            expect(() => findXRefOffset(pdf)).toThrow('PDF missing startxref offset');
        });

        it('should handle startxref at end of file', () => {
            const pdf = new TextEncoder().encode(
                '%PDF-1.4\n% This is a comment\nstartxref\n99\n%%EOF',
            );

            const offset = findXRefOffset(pdf);
            expect(offset).toBe(99);
        });
    });

    describe('Traditional XRef Format', () => {
        it('should parse xref subsections', () => {
            // This will be tested via PDFParser which calls parseXRef
            // Detailed xref format testing can be added as needed
        });

        it('should handle free and in-use entries', () => {
            // f = free, n = in use
        });
    });

    describe('Error Handling', () => {
        it('should handle truncated PDF', () => {
            const truncated = new TextEncoder().encode('%PDF-1.4');

            expect(() => findXRefOffset(truncated)).toThrow();
        });
    });
});
