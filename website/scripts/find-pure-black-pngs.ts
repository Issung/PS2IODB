/**
 * Script to find all PNG files in website/public/icons that are pure black
 * (i.e., all non-transparent pixels have RGB = 0,0,0).
 *
 * Usage:
 *   npx tsx scripts/find-pure-black-pngs.ts
 *   npx tsx scripts/find-pure-black-pngs.ts /path/to/directory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { inflateSync } from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ICONS_DIR = path.resolve(__dirname, '..', 'public', 'icons');

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

interface IHDR {
    width: number;
    height: number;
    bitDepth: number;
    colorType: number;
}

function findPngFiles(dir: string): string[] {
    const results: string[] = [];
    function walk(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
                results.push(fullPath);
            }
        }
    }
    walk(dir);
    return results;
}

function paethPredictor(a: number, b: number, c: number): number {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

function unfilterRow(row: Buffer, prevRow: Buffer | null, filterType: number, bpp: number): void {
    switch (filterType) {
        case 0: break; // None
        case 1: // Sub
            for (let i = bpp; i < row.length; i++) row[i] = (row[i] + row[i - bpp]) & 0xff;
            break;
        case 2: // Up
            if (prevRow) for (let i = 0; i < row.length; i++) row[i] = (row[i] + prevRow[i]) & 0xff;
            break;
        case 3: // Average
            for (let i = 0; i < row.length; i++) {
                const a = i >= bpp ? row[i - bpp] : 0;
                const b = prevRow ? prevRow[i] : 0;
                row[i] = (row[i] + Math.floor((a + b) / 2)) & 0xff;
            }
            break;
        case 4: // Paeth
            for (let i = 0; i < row.length; i++) {
                const a = i >= bpp ? row[i - bpp] : 0;
                const b = prevRow ? prevRow[i] : 0;
                const c = i >= bpp && prevRow ? prevRow[i - bpp] : 0;
                row[i] = (row[i] + paethPredictor(a, b, c)) & 0xff;
            }
            break;
    }
}

function isPureBlackPng(filePath: string): boolean {
    try {
        const buffer = fs.readFileSync(filePath);
        if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return false;

        let offset = 8;
        let ihdr: IHDR | null = null;
        const idatChunks: Buffer[] = [];
        let palette: Buffer | null = null;

        while (offset < buffer.length) {
            const length = buffer.readUInt32BE(offset);
            const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
            const data = buffer.subarray(offset + 8, offset + 8 + length);

            if (type === 'IHDR') {
                ihdr = {
                    width: data.readUInt32BE(0),
                    height: data.readUInt32BE(4),
                    bitDepth: data.readUInt8(8),
                    colorType: data.readUInt8(9),
                };
            } else if (type === 'PLTE') {
                palette = data;
            } else if (type === 'IDAT') {
                idatChunks.push(data);
            } else if (type === 'IEND') {
                break;
            }
            offset += 12 + length;
        }

        if (!ihdr) return false;

        const decompressed = inflateSync(Buffer.concat(idatChunks));
        const { width, height, colorType, bitDepth } = ihdr;

        // Calculate bytes per pixel
        let bpp: number;
        switch (colorType) {
            case 0: bpp = Math.ceil(bitDepth / 8); break;           // Grayscale
            case 2: bpp = 3 * Math.ceil(bitDepth / 8); break;       // RGB
            case 3: bpp = 1; break;                                  // Indexed
            case 4: bpp = 2 * Math.ceil(bitDepth / 8); break;       // Grayscale+Alpha
            case 6: bpp = 4 * Math.ceil(bitDepth / 8); break;       // RGBA
            default: return false;
        }

        const rowBytes = width * bpp;
        const bytesPerRow = 1 + rowBytes; // +1 for filter byte
        let prevRow: Buffer | null = null;

        for (let y = 0; y < height; y++) {
            const rowStart = y * bytesPerRow;
            const filterType = decompressed[rowStart];
            const row = Buffer.from(decompressed.subarray(rowStart + 1, rowStart + bytesPerRow));
            unfilterRow(row, prevRow, filterType, bpp);

            for (let x = 0; x < width; x++) {
                const px = x * bpp;
                if (!isPixelBlack(row, px, colorType, bitDepth, palette)) return false;
            }
            prevRow = row;
        }
        return true;
    } catch {
        return false;
    }
}

function isPixelBlack(row: Buffer, px: number, colorType: number, bitDepth: number, palette: Buffer | null): boolean {
    switch (colorType) {
        case 0: { // Grayscale
            const gray = bitDepth === 16 ? row.readUInt16BE(px) : row[px];
            return gray === 0;
        }
        case 2: { // RGB
            if (bitDepth === 16) {
                return row.readUInt16BE(px) === 0 && row.readUInt16BE(px + 2) === 0 && row.readUInt16BE(px + 4) === 0;
            }
            return row[px] === 0 && row[px + 1] === 0 && row[px + 2] === 0;
        }
        case 3: { // Indexed
            const idx = row[px];
            if (!palette || idx * 3 + 2 >= palette.length) return false;
            return palette[idx * 3] === 0 && palette[idx * 3 + 1] === 0 && palette[idx * 3 + 2] === 0;
        }
        case 4: { // Grayscale + Alpha
            const alpha = bitDepth === 16 ? row.readUInt16BE(px + 2) : row[px + 1];
            if (alpha === 0) return true; // Transparent = OK
            const gray = bitDepth === 16 ? row.readUInt16BE(px) : row[px];
            return gray === 0;
        }
        case 6: { // RGBA
            const alpha = bitDepth === 16 ? row.readUInt16BE(px + 6) : row[px + 3];
            if (alpha === 0) return true; // Transparent = OK
            if (bitDepth === 16) {
                return row.readUInt16BE(px) === 0 && row.readUInt16BE(px + 2) === 0 && row.readUInt16BE(px + 4) === 0;
            }
            return row[px] === 0 && row[px + 1] === 0 && row[px + 2] === 0;
        }
        default:
            return false;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const inputPath = args[0] || DEFAULT_ICONS_DIR;
    const resolvedInput = path.resolve(inputPath);

    console.log('Searching for pure black PNGs in:', resolvedInput);

    const pngFiles = findPngFiles(resolvedInput);
    console.log(`Found ${pngFiles.length} PNG files to check\n`);

    const pureBlackFiles: string[] = [];

    for (const file of pngFiles) {
        if (isPureBlackPng(file)) {
            pureBlackFiles.push(file);
            console.log(path.relative(resolvedInput, file));
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Total PNGs checked: ${pngFiles.length}`);
    console.log(`Pure black PNGs:    ${pureBlackFiles.length}`);
}

main();

