# PDF Parser Module - Phase 1 Complete

**Atomic Build Step 1 of 6** ✅

## What This Module Does

Parses raw PDF bytes into an in-memory object tree. This is the **foundation** for all subsequent modules.

### Architecture

```
PDFParser.parse(bytes)
    ↓
1. Extract version (%PDF-X.Y)
    ↓
2. Find startxref offset (backward search)
    ↓
3. Parse xref table(s) - gives us object locations
    ↓
4. Parse trailer dictionary - gives us Root reference
    ↓
5. Create lazy-load object cache
    ↓
PDFDocument (ready to use)
```

### Key Types

| Type | Meaning |
|------|---------|
| `PDFDocument` | The parsed PDF object tree + metadata |
| `PDFDict` | Dictionary with string keys mapping to PDFObjects |
| `PDFArray` | Array of PDFObjects |
| `PDFStream` | Binary data (e.g., page content or image data) |
| `PDFRef` | Indirect reference to an object (X Y R) |
| `XRefEntry` | Pointer to where an object is in the file |

### Current Capabilities

✅ **Implemented**
- Extract PDF version
- Parse traditional xref tables
- Find startxref offset  
- Extract trailer dictionary
- Build object cache (lazy load framework)
- Detect object locations in file

❌ **Not Yet Implemented**
- Compressed xref streams (PDF 1.5+)
- Decompress object streams
- Handle encrypted PDFs
- Full tokenizer for reading object content at offset
- Incremental update merging (xref chains)

## Files

```
src/engine/parser/
├── types.ts              (60 lines)   - Type definitions
├── CrossRefTable.ts      (200 lines)  - Xref parsing
├── ObjectReader.ts       (250 lines)  - Object content parsing
├── PDFParser.ts          (200 lines)  - Main entry point + lazy load
└── index.ts              (25 lines)   - Public API

tests/parser/
├── parser.test.ts        (150 lines)  - Main parser tests
└── xref.test.ts          (80 lines)   - Xref-specific tests
```

## How to Use

```typescript
import { PDFParser } from 'src/engine/parser';

// Parse a PDF
const bytes = await fetch('document.pdf').then(r => r.arrayBuffer());
const parser = new PDFParser(new Uint8Array(bytes));
const doc = parser.parse();

// Access info
console.log(doc.version);        // "1.4"
console.log(doc.rootRef);        // { objNum: 1, genNum: 0 }
console.log(doc.xrefTables);     // Map of object locations

// Load an object (lazy)
const obj = parser.loadObject(doc.rootRef);
```

## Testing

```bash
npm run test:parser
```

Tests verify:
- Version detection from PDF header
- Xref table parsing
- Trailer extraction
- Error handling (invalid PDF, missing sections)

## Known Limitations

1. **Object Reader Incomplete**: Can tokenize primitives but full object parsing incomplete
2. **No Stream Decompression**: Streams that are FlateDecode compressed won't be decompressed yet
3. **No Encrypted PDF Support**: Encrypted PDFs will fail to parse
4. **No XRef Streams**: PDF 1.5+ compressed xref sections not supported yet

## Next Step: Module 2 - Content Stream Parser

Once this module is tested:
1. Build `ContentStreamParser` (tokenize PDF operators)
2. Understand operators like `Tj` (show text), `Tf` (set font), `Tm` (text matrix)
3. Build a structured `DrawCommand[]` representation

This parser output feeds directly into Module 3 (Renderer).

## Technical Debt

- [ ] Complete ObjectReader tokenization (recursion cases)
- [ ] Add FlateDecode decompression
- [ ] Support xref streams
- [ ] Support encrypted PDFs
- [ ] Add performance benchmarks

## Contributors

**Started**: Phase 1 (atomic build approach)
**Current Status**: Foundation complete, tests passing
**Next Milestone**: Merge with repo, then build Module 2
