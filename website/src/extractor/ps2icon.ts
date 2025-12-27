/**
 * Interface for working with PS2 icon files (.ico).
 * Ported from ps2icon.py
 */

import { BinaryReader } from './utils';

const PS2_ICON_MAGIC = 0x010000;
const FIXED_POINT_FACTOR = 4096.0;

export const TEXTURE_WIDTH = 128;
export const TEXTURE_HEIGHT = 128;
const TEXTURE_SIZE = TEXTURE_WIDTH * TEXTURE_HEIGHT * 2; // 16-bit textures

export class IconError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IconError';
    }
}

export class IconCorrupt extends IconError {
    constructor(message: string) {
        super(`Corrupt icon: ${message}`);
        this.name = 'IconCorrupt';
    }
}

export class IconFileTooSmall extends IconError {
    constructor(message: string = 'Icon file too small') {
        super(message);
        this.name = 'IconFileTooSmall';
    }
}

/**
 * Animation frame key.
 */
export interface FrameKey {
    time: number;
    value: number;
}

/**
 * Animation frame data.
 */
export interface AnimationFrame {
    shapeId: number;
    keyCount: number;
    keys: FrameKey[];
}

/**
 * Animation header data.
 */
export interface AnimationHeader {
    idTag: number;
    frameLength: number;
    animSpeed: number;
    playOffset: number;
    frameCount: number;
}

/**
 * Parsed PS2 icon data.
 */
export interface PS2Icon {
    animationShapes: number;
    textureType: number;
    headerUnknown: number;
    vertexCount: number;

    /** Vertex positions: [shape][vertex][xyz] - as Int16 fixed point values */
    vertexData: Int16Array;

    /** Vertex normals: [vertex][xyz] - as Int16 fixed point values */
    normalData: Int16Array;

    /** UV coordinates: [vertex][uv] - as Int16 values */
    uvData: Int16Array;

    /** Vertex colors: [vertex][rgba] - as Uint8 values */
    colorData: Uint8Array;

    /** Animation header */
    animHeader: AnimationHeader;

    /** Animation frames */
    frames: AnimationFrame[];

    /** Texture data (16-bit per pixel, RGBA5551 format) */
    texture: Uint8Array;
}

/**
 * Parse a PS2 icon file.
 */
export function parsePS2Icon(data: Uint8Array): PS2Icon {
    const reader = new BinaryReader(data.buffer, true);
    reader.seek(data.byteOffset);
    
    let offset = 0;
    
    // Load header
    if (data.length < 20) {
        throw new IconFileTooSmall('Data length is smaller than expected icon header size.');
    }
    
    const magic = reader.readUint32();
    const animationShapes = reader.readUint32();
    const textureType = reader.readUint32();
    const headerUnknown = reader.readUint32();
    const vertexCount = reader.readUint32();
    offset = 20;

    if (magic !== PS2_ICON_MAGIC) {
        throw new IconCorrupt(`Invalid magic: ${magic.toString(16)}`);
    }

    // Calculate stride for vertex data
    // Per vertex: (vertex_coords * animation_shapes) + normal + uv + color
    const stride = (8 * animationShapes) + 8 + 4 + 4; // 8 bytes per vertex coord, 8 for normal, 4 for uv, 4 for color
    
    if (data.length < offset + vertexCount * stride) {
        throw new IconFileTooSmall('Data length is smaller than expected vertex data size.');
    }

    // Allocate arrays
    const vertexData = new Int16Array(animationShapes * 3 * vertexCount);
    const normalData = new Int16Array(3 * vertexCount);
    const uvData = new Int16Array(2 * vertexCount);
    const colorData = new Uint8Array(4 * vertexCount);

    // Load vertex data
    for (let i = 0; i < vertexCount; i++) {
        // Read vertex coordinates for each animation shape
        for (let s = 0; s < animationShapes; s++) {
            const vertexOffset = (s * vertexCount + i) * 3;
            vertexData[vertexOffset] = reader.readInt16();
            vertexData[vertexOffset + 1] = reader.readInt16();
            vertexData[vertexOffset + 2] = reader.readInt16();
            reader.skip(2); // padding
        }

        // Read normal
        normalData[i * 3] = reader.readInt16();
        normalData[i * 3 + 1] = reader.readInt16();
        normalData[i * 3 + 2] = reader.readInt16();
        reader.skip(2); // padding

        // Read UV
        uvData[i * 2] = reader.readInt16();
        uvData[i * 2 + 1] = reader.readInt16();

        // Read color
        colorData[i * 4] = reader.readUint8();
        colorData[i * 4 + 1] = reader.readUint8();
        colorData[i * 4 + 2] = reader.readUint8();
        colorData[i * 4 + 3] = reader.readUint8();
    }

    offset = reader.position;

    // Load animation header
    if (data.length < offset + 20) {
        throw new IconFileTooSmall('Data length is smaller than expected animation data size.');
    }

    const animHeader: AnimationHeader = {
        idTag: reader.readUint32(),
        frameLength: reader.readUint32(),
        animSpeed: reader.readFloat32(),
        playOffset: reader.readUint32(),
        frameCount: reader.readUint32()
    };
    offset += 20;

    if (animHeader.idTag !== 0x01) {
        throw new IconCorrupt(`Invalid ID tag in animation header: ${animHeader.idTag.toString(16)}`);
    }

    // Load animation frames
    const frames: AnimationFrame[] = [];
    for (let i = 0; i < animHeader.frameCount; i++) {
        if (data.length < offset + 8) {
            throw new IconFileTooSmall('Data length is smaller than expected frame data size.');
        }

        const shapeId = reader.readUint32();
        const keyCount = reader.readUint32();
        offset += 8;

        const keys: FrameKey[] = [];
        for (let k = 0; k < keyCount; k++) {
            if (data.length < offset + 8) {
                throw new IconFileTooSmall('Data length is smaller than expected frame key size.');
            }
            keys.push({
                time: reader.readFloat32(),
                value: reader.readFloat32()
            });
            offset += 8;
        }

        frames.push({ shapeId, keyCount, keys });
    }

    // Load texture
    let texture: Uint8Array;

    // Check texture_type bits to determine loading strategy
    // Bit 2 (0b0100): texture present
    // Bit 3 (0b1000): texture is compressed
    if (textureType & 0b0100) {
        if (textureType & 0b1000) {
            // Compressed texture
            texture = loadTextureCompressed(reader, data.length, offset);
        } else {
            // Uncompressed texture
            texture = loadTextureUncompressed(reader, data.length, offset);
        }
    } else {
        // No texture, fill with white (0xFFFF per pixel)
        texture = new Uint8Array(TEXTURE_SIZE);
        for (let i = 0; i < TEXTURE_SIZE; i += 2) {
            texture[i] = 0xFF;
            texture[i + 1] = 0xFF;
        }
    }

    return {
        animationShapes,
        textureType,
        headerUnknown,
        vertexCount,
        vertexData,
        normalData,
        uvData,
        colorData,
        animHeader,
        frames,
        texture
    };
}

function loadTextureUncompressed(reader: BinaryReader, length: number, offset: number): Uint8Array {
    const availableBytes = length - offset;
    const bytesToRead = Math.min(availableBytes, TEXTURE_SIZE);
    const chunk = reader.readBytes(bytesToRead);

    // Pad with 0x00 if too short
    const diff = TEXTURE_SIZE - bytesToRead;
    if (diff > 0) {
        console.warn(`Warning: Uncompressed texture is ${diff} bytes smaller than expected. Filling remaining data with 00 (black).`);
        const padded = new Uint8Array(TEXTURE_SIZE);
        padded.set(chunk);
        // Remaining bytes are already 0x00 by default in Uint8Array
        return padded;
    }

    return chunk;
}

function loadTextureCompressed(reader: BinaryReader, length: number, offset: number): Uint8Array {
    if (length < offset + 4) {
        throw new IconFileTooSmall('Data length is smaller than expected compressed texture header size.');
    }

    const compressedSize = reader.readUint32();
    offset += 4;

    if (length < offset + compressedSize) {
        throw new IconFileTooSmall('Data length is smaller than expected compressed texture size.');
    }

    if (compressedSize % 2 !== 0) {
        throw new IconCorrupt('Compressed data size is odd.');
    }

    const textureBuf = new Uint8Array(TEXTURE_SIZE);
    let texOffset = 0;
    let rleOffset = 0;

    const compressedData = reader.readBytes(compressedSize);

    while (rleOffset < compressedSize) {
        if (rleOffset + 2 > compressedSize) {
            throw new IconCorrupt('Compressed data too short for RLE code.');
        }

        const rleCode = compressedData[rleOffset] | (compressedData[rleOffset + 1] << 8);
        rleOffset += 2;

        if (rleCode & 0x8000) {
            // Literal run: use next literalCount pixels as they are
            const literalCount = 0x8000 - (rleCode ^ 0x8000);
            for (let i = 0; i < literalCount; i++) {
                if (rleOffset + 2 > compressedSize) {
                    throw new IconCorrupt('Compressed data too short for literal pixel.');
                }
                if (texOffset >= TEXTURE_SIZE) {
                    break;
                }
                textureBuf[texOffset++] = compressedData[rleOffset++];
                textureBuf[texOffset++] = compressedData[rleOffset++];
            }
        } else {
            // Repeat run: repeat next pixel rleCode times
            const times = rleCode;
            if (times > 0) {
                if (rleOffset + 2 > compressedSize) {
                    throw new IconCorrupt('Compressed data too short for repeated pixel.');
                }
                const byte0 = compressedData[rleOffset];
                const byte1 = compressedData[rleOffset + 1];
                rleOffset += 2;

                for (let i = 0; i < times; i++) {
                    if (texOffset >= TEXTURE_SIZE) {
                        break;
                    }
                    textureBuf[texOffset++] = byte0;
                    textureBuf[texOffset++] = byte1;
                }
            }
        }
    }

    // Remaining bytes are already initialized to 0 (black)
    return textureBuf;
}

/**
 * Convert fixed-point vertex data to floating point.
 */
export function vertexToFloat(value: number): number {
    return value / FIXED_POINT_FACTOR;
}

/**
 * Convert 16-bit RGBA5551 texture data to RGBA8888.
 * PS2 icon texture format is: ABBBBBGGGGGRRRRR (1-5-5-5)
 * - bit 15: Alpha (1 = opaque, 0 = semi-transparent)
 * - bits 14-10: Blue
 * - bits 9-5: Green
 * - bits 4-0: Red
 */
export function textureToRGBA(texture: Uint8Array): Uint8Array {
    const rgba = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);

    for (let i = 0; i < TEXTURE_WIDTH * TEXTURE_HEIGHT; i++) {
        const pixel = texture[i * 2] | (texture[i * 2 + 1] << 8);

        // Extract 5-bit components and expand to 8-bit
        const r = ((pixel >> 0) & 0x1F);
        const g = ((pixel >> 5) & 0x1F);
        const b = ((pixel >> 10) & 0x1F);
        const a = (pixel >> 15) & 0x1;

        // Expand 5-bit to 8-bit (multiply by 255/31 ≈ 8.23, or shift left 3 and fill)
        rgba[i * 4 + 0] = (r << 3) | (r >> 2);
        rgba[i * 4 + 1] = (g << 3) | (g >> 2);
        rgba[i * 4 + 2] = (b << 3) | (b >> 2);
        rgba[i * 4 + 3] = a ? 255 : 128;  // Full alpha or semi-transparent
    }

    return rgba;
}

