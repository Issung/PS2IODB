/**
 * Utility class for reading binary data from ArrayBuffer/DataView.
 */
export class BinaryReader {
    private view: DataView;
    private _pos: number = 0;
    private littleEndian: boolean;

    constructor(buffer: ArrayBufferLike, littleEndian: boolean = true) {
        this.view = new DataView(buffer as ArrayBuffer);
        this.littleEndian = littleEndian;
    }

    get position(): number {
        return this._pos;
    }

    get length(): number {
        return this.view.byteLength;
    }

    get remaining(): number {
        return this.length - this._pos;
    }

    seek(offset: number): void {
        this._pos = offset;
    }

    skip(bytes: number): void {
        this._pos += bytes;
    }

    readUint8(): number {
        const val = this.view.getUint8(this._pos);
        this._pos += 1;
        return val;
    }

    readInt16(): number {
        const val = this.view.getInt16(this._pos, this.littleEndian);
        this._pos += 2;
        return val;
    }

    readUint16(): number {
        const val = this.view.getUint16(this._pos, this.littleEndian);
        this._pos += 2;
        return val;
    }

    readInt32(): number {
        const val = this.view.getInt32(this._pos, this.littleEndian);
        this._pos += 4;
        return val;
    }

    readUint32(): number {
        const val = this.view.getUint32(this._pos, this.littleEndian);
        this._pos += 4;
        return val;
    }

    readFloat32(): number {
        const val = this.view.getFloat32(this._pos, this.littleEndian);
        this._pos += 4;
        return val;
    }

    readBytes(length: number): Uint8Array {
        const bytes = new Uint8Array(this.view.buffer, this._pos, length);
        this._pos += length;
        return bytes;
    }

    /**
     * Read a null-terminated ASCII string.
     */
    readFixedString(length: number): string {
        const bytes = this.readBytes(length);
        return zeroTerminate(bytes);
    }

    /**
     * Creates a sub-reader for a portion of the buffer.
     */
    slice(offset: number, length: number): BinaryReader {
        const slice = this.view.buffer.slice(offset, offset + length);
        return new BinaryReader(slice, this.littleEndian);
    }
}

/**
 * Truncate a byte array at the first NUL character and convert to string.
 */
export function zeroTerminate(bytes: Uint8Array): string {
    let end = bytes.indexOf(0);
    if (end === -1) end = bytes.length;
    const decoder = new TextDecoder('ascii');
    return decoder.decode(bytes.subarray(0, end));
}

/**
 * Truncate a byte array at the first NUL character.
 */
export function zeroTerminateBytes(bytes: Uint8Array): Uint8Array {
    let end = bytes.indexOf(0);
    if (end === -1) end = bytes.length;
    return bytes.subarray(0, end);
}

/**
 * Round up to the nearest multiple.
 */
export function roundUp(value: number, multiple: number): number {
    return Math.ceil(value / multiple) * multiple;
}

/**
 * Round down to the nearest multiple.
 */
export function roundDown(value: number, multiple: number): number {
    return Math.floor(value / multiple) * multiple;
}

/**
 * Integer division, rounding up.
 */
export function divRoundUp(a: number, b: number): number {
    return Math.ceil(a / b);
}

