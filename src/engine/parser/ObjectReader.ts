/**
 * PDF Object Reader
 * 
 * Reads PDF object definitions from byte stream.
 * Handles:
 * - Numbers (123, -456, 3.14)
 * - Strings (both literal () and hex <>)
 * - Names (/Type, /Font)
 * - Arrays [item1 item2 item3]
 * - Dictionaries << key value >> with possible stream
 * - Indirect references (5 0 R)
 * 
 * PDF spec: section 3.2 (Objects)
 */

import { PDFObject, PDFDict, PDFArray, PDFStream, PDFRef, PDFName, name, ref, isDict } from './types';

/**
 * Tokenizer for PDF content
 * Breaks byte stream into meaningful chunks
 */
class PDFTokenizer {
    private bytes: Uint8Array;
    private pos: number = 0;

    constructor(bytes: Uint8Array) {
        this.bytes = bytes;
    }

    // Skip whitespace and comments
    public skipWhitespace(): void {
        while (this.pos < this.bytes.length) {
            const b = this.bytes[this.pos];

            // Whitespace: \0, \t, \n, \f, \r, space
            if (b === 0 || b === 9 || b === 10 || b === 12 || b === 13 || b === 32) {
                this.pos++;
            }
            // Comment: %
            else if (b === 0x25) {
                while (this.pos < this.bytes.length && this.bytes[this.pos] !== 0x0a && this.bytes[this.pos] !== 0x0d) {
                    this.pos++;
                }
            } else {
                break;
            }
        }
    }

    /**
     * Peek the next byte without consuming
     */
    peek(): number | undefined {
        this.skipWhitespace();
        return this.pos < this.bytes.length ? this.bytes[this.pos] : undefined;
    }

    /**
     * Consume and return the next byte
     */
    read(): number | undefined {
        this.skipWhitespace();
        return this.pos < this.bytes.length ? this.bytes[this.pos++] : undefined;
    }

    /**
     * Read a word (sequence of non-delimiter characters)
     */
    readWord(): string {
        this.skipWhitespace();
        const start = this.pos;

        // Delimiters: whitespace and <>(){}[]/%
        while (this.pos < this.bytes.length) {
            const b = this.bytes[this.pos];
            if (
                b === 0 ||
                b === 9 ||
                b === 10 ||
                b === 12 ||
                b === 13 ||
                b === 32 ||
                b === 0x3c ||
                b === 0x3e ||
                b === 0x28 ||
                b === 0x29 ||
                b === 0x7b ||
                b === 0x7d ||
                b === 0x5b ||
                b === 0x5d ||
                b === 0x2f ||
                b === 0x25
            ) {
                break;
            }
            this.pos++;
        }

        return new TextDecoder().decode(this.bytes.subarray(start, this.pos));
    }

    /**
     * Read until a specific sequence
     */
    public readUntil(sequence: string): Uint8Array {
        const decoder = new TextDecoder();
        const start = this.pos;
        const searchBytes = new TextEncoder().encode(sequence);

        while (this.pos < this.bytes.length - searchBytes.length) {
            const chunk = decoder.decode(this.bytes.subarray(this.pos, this.pos + searchBytes.length));
            if (chunk === sequence) {
                const result = this.bytes.subarray(start, this.pos);
                this.pos += searchBytes.length;
                return result;
            }
            this.pos++;
        }

        throw new Error(`Could not find sequence: ${sequence}`);
    }

    getRemainingBytes(): Uint8Array {
        return this.bytes.subarray(this.pos);
    }

    getPosition(): number {
        return this.pos;
    }

    setPosition(pos: number): void {
        this.pos = pos;
    }
}

/**
 * Read a number (integer or float)
 */
function readNumber(tokenizer: PDFTokenizer): number {
    const word = tokenizer.readWord();
    return parseFloat(word);
}

/**
 * Read a string: either (literal) or <hex>
 */
function readString(tokenizer: PDFTokenizer): string {
    const b = tokenizer.peek();

    if (b === 0x28) {
        // Literal string (...)
        tokenizer.read(); // consume (
        const bytes: number[] = [];
        let parenDepth = 1;

        while (parenDepth > 0 && tokenizer.peek() !== undefined) {
            const ch = tokenizer.read()!;
            if (ch === 0x28) parenDepth++; // (
            else if (ch === 0x29) parenDepth--; // )
            else if (ch === 0x5c) {
                // Escaped character \
                const next = tokenizer.read();
                if (next === 0x6e) bytes.push(0x0a); // \n
                else if (next === 0x72) bytes.push(0x0d); // \r
                else if (next === 0x74) bytes.push(0x09); // \t
                else if (next === 0x28) bytes.push(0x28); // \(
                else if (next === 0x29) bytes.push(0x29); // \)
                else if (next === 0x5c) bytes.push(0x5c); // \\
                else bytes.push(next!);
            } else {
                bytes.push(ch);
            }
        }

        return new TextDecoder().decode(new Uint8Array(bytes));
    } else if (b === 0x3c) {
        // Hex string <...>
        tokenizer.read(); // consume <
        const hexStr: string[] = [];

        while (tokenizer.peek() !== 0x3e) {
            const ch = String.fromCharCode(tokenizer.read()!);
            if (!/\s/.test(ch)) hexStr.push(ch);
        }

        tokenizer.read(); // consume >

        // Convert hex to string
        const hexString = hexStr.join('');
        const bytes = [];
        for (let i = 0; i < hexString.length; i += 2) {
            bytes.push(parseInt(hexString.substr(i, 2), 16));
        }

        return new TextDecoder().decode(new Uint8Array(bytes));
    }

    throw new Error('Invalid string format');
}

/**
 * Read a name /Type, /Font, etc.
 */
function readName(tokenizer: PDFTokenizer): PDFName {
    const b = tokenizer.peek();
    if (b !== 0x2f) throw new Error('Expected / for name');

    tokenizer.read(); // consume /
    const word = tokenizer.readWord();
    return name(word);
}

/**
 * Read an array [item1 item2 item3]
 */
function readArray(tokenizer: PDFTokenizer): PDFArray {
    const b = tokenizer.peek();
    if (b !== 0x5b) throw new Error('Expected [ for array');

    tokenizer.read(); // consume [
    const items: PDFObject[] = [];

    while (tokenizer.peek() !== 0x5d) {
        // 0x5d = ]
        items.push(readObject(tokenizer));
    }

    tokenizer.read(); // consume ]
    return { type: 'array', items };
}

/**
 * Read a dictionary << key value >>
 */
function readDict(tokenizer: PDFTokenizer): PDFDict {
    let b = tokenizer.peek();
    if (b !== 0x3c) throw new Error('Expected < for dict');

    tokenizer.read(); // consume <
    if (tokenizer.peek() !== 0x3c) throw new Error('Expected << for dict');
    tokenizer.read(); // consume <

    const entries = new Map<string, PDFObject>();

    while (true) {
        // Check for >>
        if (tokenizer.peek() === 0x3e) {
            tokenizer.read(); // consume >
            if (tokenizer.peek() === 0x3e) {
                tokenizer.read(); // consume >
                break;
            } else {
                throw new Error('Expected >> to close dict');
            }
        }

        // Read key (must be a name)
        const keyObj = readObject(tokenizer);
        if (!keyObj || typeof keyObj !== 'object' || keyObj.type !== 'name') throw new Error('Dictionary key must be a name');
        const key = (keyObj as any).value;

        // Read value
        const value = readObject(tokenizer);
        entries.set(key, value);
    }

    return { type: 'dict', entries };
}

/**
 * Main object reader
 */
export function readObject(tokenizer: PDFTokenizer): PDFObject {
    const b = tokenizer.peek();

    if (b === undefined) return null;

    // Null (null keyword)
    if (b === 0x6e) {
        // n
        const word = tokenizer.readWord();
        if (word === 'null') return null;
        if (word === 'true') return true;
        if (word === 'false') return false;
        throw new Error('Unknown keyword: ' + word);
    }

    // Boolean
    if (b === 0x74 || b === 0x66) {
        // t or f
        const word = tokenizer.readWord();
        if (word === 'true') return true;
        if (word === 'false') return false;
    }

    // Number (- or digit)
    if (b === 0x2d || (b >= 0x30 && b <= 0x39)) {
        // - or 0-9
        const num = readNumber(tokenizer);

        // Check if followed by another number and R (reference)
        const nextB = tokenizer.peek();
        if (nextB !== undefined && nextB >= 0x30 && nextB <= 0x39) {
            // Could be "5 0 R"
            const genNum = readNumber(tokenizer);
            if (tokenizer.readWord() === 'R') {
                return ref(Math.floor(num), Math.floor(genNum));
            } else {
                throw new Error('Invalid reference format');
            }
        }

        return num;
    }

    // String
    if (b === 0x28 || b === 0x3c) {
        // ( or <
        return readString(tokenizer);
    }

    // Name
    if (b === 0x2f) {
        // /
        return readName(tokenizer);
    }

    // Array
    if (b === 0x5b) {
        // [
        return readArray(tokenizer);
    }

    // Dictionary or Stream
    if (b === 0x3c) {
        // <
        const dict = readDict(tokenizer);

        // Check for stream keyword - peek without consuming
        const savedPos = tokenizer.getPosition();
        const next = tokenizer.readWord();
        if (next === 'stream') {
            // Skip whitespace and newline
            tokenizer.skipWhitespace();

            // Read stream data until "endstream"
            const streamData = tokenizer.readUntil('endstream');

            return {
                type: 'stream',
                dict,
                data: streamData,
            };
        } else {
            // Not a stream, reset position
            tokenizer.setPosition(savedPos);
            return dict;
        }
    }

    throw new Error(`Unknown object type at byte ${b}`);
}

/**
 * Read an indirect object definition
 * Format: "5 0 obj ... endobj"
 */
export function readIndirectObject(tokenizer: PDFTokenizer): { objNum: number; genNum: number; object: PDFObject } {
    const objNum = readNumber(tokenizer);
    const genNum = readNumber(tokenizer);
    const word = tokenizer.readWord();

    if (word !== 'obj') throw new Error('Expected obj keyword');

    const obj = readObject(tokenizer);

    const endWord = tokenizer.readWord();
    if (endWord !== 'endobj') throw new Error('Expected endobj keyword');

    return { objNum: Math.floor(objNum), genNum: Math.floor(genNum), object: obj };
}
