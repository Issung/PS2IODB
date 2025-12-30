/**
 * Implementation of Haruhiko Okumura's LZARI data compression algorithm in TypeScript.
 * Ported from lzari.py (based on mymc by Ross Ridge).
 *
 * This file is part of mymc+, based on mymc by Ross Ridge.
 *
 * mymc+ is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Fundamental constants of the LZARI compression algorithm.
// Changing any of these values will create an incompatible implementation.
const HIST_LEN = 4096;
const MIN_MATCH_LEN = 3;
const MAX_MATCH_LEN = 60;

const ARITH_BITS = 15;
const QUADRANT1 = 1 << ARITH_BITS;
const QUADRANT2 = QUADRANT1 * 2;
const QUADRANT3 = QUADRANT1 * 3;
const QUADRANT4 = QUADRANT1 * 4;
const MAX_CUM = QUADRANT1 - 1;
const MAX_CHAR = (256 + MAX_MATCH_LEN - MIN_MATCH_LEN + 1);

/**
 * Convert a Uint8Array to a bit array.
 */
function bytesToBitArray(data: Uint8Array): Uint8Array {
    const result = new Uint8Array(data.length * 8 + 32); // Add 32 extra bits
    for (let i = 0; i < data.length; i++) {
        const byte = data[i];
        for (let j = 0; j < 8; j++) {
            result[i * 8 + j] = (byte >> (7 - j)) & 1;
        }
    }
    return result;
}

/**
 * Binary search for decode_position.
 */
function search(table: number[], x: number): number {
    let c = 1;
    let s = table.length - 1;
    while (true) {
        const a = Math.floor((s + c) / 2);
        if (table[a] <= x) {
            s = a;
        } else {
            c = a + 1;
        }
        if (c >= s) {
            break;
        }
    }
    return c;
}

/**
 * Binary search similar to Python's bisect_right.
 */
function bisectRight(arr: number[], x: number, lo: number): number {
    let hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (x < arr[mid]) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    return lo;
}

/**
 * LZARI decoder class.
 */
class LzariDecoder {
    private high = QUADRANT4;
    private low = 0;
    private code = 0;
    private symCum: number[];
    private symbolToChar: number[];
    private symFreq: number[];
    private positionCum: number[];
    private bitIndex = 0;
    private bits: Uint8Array;

    constructor(bits: Uint8Array) {
        this.bits = bits;

        // Initialize symbol cumulative frequency (reversed order for bisect_right)
        this.symCum = [];
        for (let i = 0; i <= MAX_CHAR; i++) {
            this.symCum.push(i);
        }

        // Initialize symbol to char mapping
        this.symbolToChar = [0];
        for (let i = 0; i < MAX_CHAR; i++) {
            this.symbolToChar.push(i);
        }

        // Initialize symbol frequency
        this.symFreq = [0];
        for (let i = 0; i < MAX_CHAR; i++) {
            this.symFreq.push(1);
        }

        // Initialize position cumulative frequency
        this.positionCum = new Array(HIST_LEN + 1).fill(0);
        let a = 0;
        for (let i = HIST_LEN; i > 0; i--) {
            a = a + Math.floor(10000 / (200 + i));
            this.positionCum[i - 1] = a;
        }

        // Initialize code from first ARITH_BITS+2 bits
        for (let i = 0; i < ARITH_BITS + 2; i++) {
            this.code = this.code * 2 + this.nextBit();
        }
    }

    private nextBit(): number {
        return this.bits[this.bitIndex++] || 0;
    }

    private updateModelDecode(symbol: number): void {
        if (this.symCum[MAX_CHAR] >= MAX_CUM) {
            let c = 0;
            for (let i = MAX_CHAR; i > 0; i--) {
                this.symCum[MAX_CHAR - i] = c;
                const a = Math.floor((this.symFreq[i] + 1) / 2);
                this.symFreq[i] = a;
                c += a;
            }
            this.symCum[MAX_CHAR] = c;
        }

        const freq = this.symFreq[symbol];
        let newSymbol = symbol;
        while (this.symFreq[newSymbol - 1] === freq) {
            newSymbol--;
        }

        if (newSymbol !== symbol) {
            const swapChar = this.symbolToChar[newSymbol];
            const char = this.symbolToChar[symbol];
            this.symbolToChar[newSymbol] = char;
            this.symbolToChar[symbol] = swapChar;
        }

        this.symFreq[newSymbol] = freq + 1;
        for (let i = MAX_CHAR - newSymbol + 1; i <= MAX_CHAR; i++) {
            this.symCum[i] += 1;
        }
    }

    private decodeChar(): number {
        const range = this.high - this.low;
        const maxCumFreq = this.symCum[MAX_CHAR];
        const n = Math.floor(((this.code - this.low + 1) * maxCumFreq - 1) / range);
        const i = bisectRight(this.symCum, n, 1);
        this.high = this.low + Math.floor(this.symCum[i] * range / maxCumFreq);
        this.low += Math.floor(this.symCum[i - 1] * range / maxCumFreq);
        const symbol = MAX_CHAR + 1 - i;

        while (true) {
            if (this.low < QUADRANT2) {
                if (this.low < QUADRANT1 || this.high > QUADRANT3) {
                    if (this.high > QUADRANT2) {
                        break;
                    }
                } else {
                    this.low -= QUADRANT1;
                    this.code -= QUADRANT1;
                    this.high -= QUADRANT1;
                }
            } else {
                this.low -= QUADRANT2;
                this.code -= QUADRANT2;
                this.high -= QUADRANT2;
            }
            this.low *= 2;
            this.high *= 2;
            this.code = this.code * 2 + this.nextBit();
        }

        const ret = this.symbolToChar[symbol];
        this.updateModelDecode(symbol);
        return ret;
    }

    private decodePosition(): number {
        const range = this.high - this.low;
        const maxCum = this.positionCum[0];
        const pos = search(this.positionCum, Math.floor(((this.code - this.low + 1) * maxCum - 1) / range)) - 1;
        this.high = this.low + Math.floor(this.positionCum[pos] * range / maxCum);
        this.low += Math.floor(this.positionCum[pos + 1] * range / maxCum);

        while (true) {
            if (this.low < QUADRANT2) {
                if (this.low < QUADRANT1 || this.high > QUADRANT3) {
                    if (this.high > QUADRANT2) {
                        return pos;
                    }
                } else {
                    this.low -= QUADRANT1;
                    this.code -= QUADRANT1;
                    this.high -= QUADRANT1;
                }
            } else {
                this.low -= QUADRANT2;
                this.code -= QUADRANT2;
                this.high -= QUADRANT2;
            }
            this.low *= 2;
            this.high *= 2;
            this.code = this.nextBit() + this.code * 2;
        }
    }

    /**
     * Decompress data to specified output length.
     */
    decode(outLength: number): Uint8Array {
        const out = new Uint8Array(outLength);
        let outpos = 0;

        let histPos = HIST_LEN - MAX_MATCH_LEN;
        const history = new Uint8Array(HIST_LEN);
        // Initialize history with spaces (0x20)
        for (let i = 0; i < histPos; i++) {
            history[i] = 0x20;
        }

        while (outpos < outLength) {
            const char = this.decodeChar();
            if (char >= 0x100) {
                const pos = this.decodePosition();
                const length = char - 0x100 + MIN_MATCH_LEN;
                const base = (histPos - pos - 1 + HIST_LEN) % HIST_LEN;
                for (let off = 0; off < length; off++) {
                    const a = history[(base + off) % HIST_LEN];
                    out[outpos++] = a;
                    history[histPos] = a;
                    histPos = (histPos + 1) % HIST_LEN;
                }
            } else {
                out[outpos++] = char;
                history[histPos] = char;
                histPos = (histPos + 1) % HIST_LEN;
            }
        }

        return out;
    }
}

/**
 * Decompress LZARI-compressed data.
 * @param src Compressed data
 * @param outLength Expected uncompressed length
 * @returns Decompressed data
 */
export function lzariDecode(src: Uint8Array, outLength: number): Uint8Array {
    const bits = bytesToBitArray(src);
    const decoder = new LzariDecoder(bits);
    return decoder.decode(outLength);
}
