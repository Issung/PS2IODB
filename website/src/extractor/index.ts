/**
 * PS2 Memory Card and Save File Extractor
 *
 * This module provides functionality to parse PS2 memory card images
 * and save files to extract icon data for viewing.
 */

export * from './importers';
export type { ImportedSave } from './importers';
export * from './ps2icon';
export * from './ps2iconsys';
export * from './ps2mc';
export * from './ps2mcDir';
export * from './ps2save';
export * from './utils';

import { ModelFiles } from '../components/ModelView/ModelFiles';
import { AnimationData, AnimationFrameKey, AnimationFrame as ModelAnimationFrame } from '../model/AnimationData';
import { IconSys } from '../model/IconSys';
import { ImportedSave, importers } from './importers';
import { PS2Icon, TEXTURE_HEIGHT, TEXTURE_WIDTH } from './ps2icon';
import { IconSysData, bgColorToHex } from './ps2iconsys';

/**
 * Load and parse a memory card or save file.
 * Iterates through registered importers to find one that can handle the file.
 */
export async function loadFile(file: File): Promise<ImportedSave[]> {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);

    // Try each registered importer
    for (const importer of importers) {
        if (importer.handles(data)) {
            console.log(`Using importer: ${importer.name}`);
            return importer.load(data);
        }
    }

    // No importer found
    const magic = new TextDecoder('ascii').decode(data.subarray(0, 30));
    const supportedFormats = importers.map(i => i.name).join(', ');
    throw new Error(`Unsupported file format. Magic found: "${magic}". Supported formats: ${supportedFormats}`);
}

/**
 * Convert an ImportedSave to ModelFiles format for use with FileModelLoader.
 * Generates OBJ, MTL, PNG, and ANIM files from the PS2Icon data.
 */
export function importedSaveToModelFiles(save: ImportedSave): ModelFiles {
    if (!save.iconSys) {
        throw new Error('Cannot convert save without iconSys data');
    }

    const iconSys = convertToIconSys(save.iconSys, save.title);
    const files = new Map<string, Blob>();

    // Process each icon
    save.icons.forEach((icon, filename) => {
        // Generate OBJ content
        const objContent = generateOBJ(icon, filename);
        files.set(`${filename}.obj`, new Blob([objContent], { type: 'text/plain' }));

        // Generate MTL content (matches Python iconexport.py)
        const textureFilename = `${filename}.png`;
        const mtlContent = `newmtl Texture\nmap_Kd ${textureFilename}\n`;
        files.set(`${filename}.mtl`, new Blob([mtlContent], { type: 'text/plain' }));

        // Generate texture PNG
        const pngBlob = createTexturePngBlob(icon);
        files.set(textureFilename, pngBlob);

        // Generate animation data if present
        const animData = convertAnimationData(icon);
        if (animData) {
            const animContent = JSON.stringify(animData);
            files.set(`${filename}.anim`, new Blob([animContent], { type: 'application/json' }));
        }
    });

    return new ModelFiles(files, iconSys);
}

/**
 * Convert IconSysData (extractor format) to IconSys (ModelView format).
 */
function convertToIconSys(data: IconSysData, title: string): IconSys {
    const iconSys = new IconSys();
    iconSys.normal = data.iconFileNormal;
    iconSys.copy = data.iconFileCopy;
    iconSys.delete = data.iconFileDelete;
    iconSys.title = title;

    // Background colors
    iconSys.bgOpacity = data.backgroundTransparency;
    iconSys.bgColTL = bgColorToHex(data.bgColors[0]);
    iconSys.bgColTR = bgColorToHex(data.bgColors[1]);
    iconSys.bgColBL = bgColorToHex(data.bgColors[2]);
    iconSys.bgColBR = bgColorToHex(data.bgColors[3]);

    // Light directions
    iconSys.light1Dir = data.lightDirs[0];
    iconSys.light2Dir = data.lightDirs[1];
    iconSys.light3Dir = data.lightDirs[2];

    // Light colors
    iconSys.light1Col = data.lightColors[0];
    iconSys.light2Col = data.lightColors[1];
    iconSys.light3Col = data.lightColors[2];
    iconSys.ambiLightCol = data.ambientLightColor;

    return iconSys;
}

/**
 * Generate OBJ file content from PS2Icon data.
 * Matches the Python iconexport.py export_variant function.
 */
function generateOBJ(icon: PS2Icon, filename: string): string {
    const FIXED_POINT_FACTOR = 4096.0;
    const lines: string[] = [];
    lines.push(`# OBJ file`);
    lines.push(`mtllib ${filename}.mtl`);

    const vertexCount = icon.vertexCount;

    // Write vertices with vertex colors (shape 0 only for OBJ base mesh)
    // Python: vertex_x = -icon.vertex_data[vertex_index * 3] / MAX_CONST
    //         vertex_y = -icon.vertex_data[vertex_index * 3 + 1] / MAX_CONST
    //         vertex_z = icon.vertex_data[vertex_index * 3 + 2] / MAX_CONST
    for (let i = 0; i < vertexCount; i++) {
        const x = -icon.vertexData[i * 3] / FIXED_POINT_FACTOR;
        const y = -icon.vertexData[i * 3 + 1] / FIXED_POINT_FACTOR;
        const z = icon.vertexData[i * 3 + 2] / FIXED_POINT_FACTOR;
        const r = icon.colorData[i * 4 + 0] / 255;
        const g = icon.colorData[i * 4 + 1] / 255;
        const b = icon.colorData[i * 4 + 2] / 255;
        const a = icon.colorData[i * 4 + 3] / 255;
        lines.push(`v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)} ${r.toFixed(6)} ${g.toFixed(6)} ${b.toFixed(6)} #${a.toFixed(6)}`);
    }

    // Write texture coordinates
    // Python: u = round(icon.uv_data[uv_index * 2] / MAX_CONST, 6)
    //         v = round(icon.uv_data[uv_index * 2 + 1] / MAX_CONST, 6)
    for (let i = 0; i < vertexCount; i++) {
        const u = icon.uvData[i * 2] / FIXED_POINT_FACTOR;
        const v = icon.uvData[i * 2 + 1] / FIXED_POINT_FACTOR;
        lines.push(`vt ${u.toFixed(6)} ${v.toFixed(6)} 0.000000`);
    }

    // Write normals
    // Python: normal_x = icon.vertex_normals[normal_index * 3] / MAX_CONST (no negation)
    for (let i = 0; i < vertexCount; i++) {
        const nx = icon.normalData[i * 3] / FIXED_POINT_FACTOR;
        const ny = icon.normalData[i * 3 + 1] / FIXED_POINT_FACTOR;
        const nz = icon.normalData[i * 3 + 2] / FIXED_POINT_FACTOR;
        lines.push(`vn ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)}`);
    }

    // Use material
    lines.push("usemtl Texture");

    // Write faces - triangle list, every 3 vertices form a face
    // Python: for face_index in range(int(icon.vertex_count / 3)):
    //             v1 = face_index * 3 + 1 (OBJ indices are 1-based)
    const faceCount = Math.floor(vertexCount / 3);
    for (let faceIdx = 0; faceIdx < faceCount; faceIdx++) {
        const v1 = faceIdx * 3 + 1;
        const v2 = faceIdx * 3 + 2;
        const v3 = faceIdx * 3 + 3;
        lines.push(`f ${v1}/${v1}/${v1} ${v2}/${v2}/${v2} ${v3}/${v3}/${v3}`);
    }

    return lines.join("\n");
}

/**
 * Create a PNG blob from PS2Icon texture data.
 * Matches Python iconexport.py which flips Y: y = 127 - int((i / step_size) / 128)
 */
function createTexturePngBlob(icon: PS2Icon): Blob {
    // Create canvas and draw pixels directly like Python does
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_WIDTH;
    canvas.height = TEXTURE_HEIGHT;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(TEXTURE_WIDTH, TEXTURE_HEIGHT);

    // Python code:
    // for i in range(0, len(icon.texture), step_size):
    //     x = int((i / step_size) % 128)
    //     y = 127 - int((i / step_size) / 128)  <-- Y is flipped
    const stepSize = 2;
    for (let i = 0; i < icon.texture.length; i += stepSize) {
        const pixelIndex = i / stepSize;
        const x = pixelIndex % 128;
        const y = 127 - Math.floor(pixelIndex / 128);  // Flip Y like Python

        // Read 16-bit pixel (little endian)
        const col = icon.texture[i] | (icon.texture[i + 1] << 8);

        // Extract RGB components (5 bits each, shift left 3 to expand to 8 bits)
        const r = (col & 0x1F) << 3;
        const g = ((col >> 5) & 0x1F) << 3;
        const b = (((col >> 10)) << 3) & 0xFF;  // Match Python's masking for compressed icons
        const a = 255;

        // Write to image data
        const dataIndex = (y * TEXTURE_WIDTH + x) * 4;
        imageData.data[dataIndex + 0] = r;
        imageData.data[dataIndex + 1] = g;
        imageData.data[dataIndex + 2] = b;
        imageData.data[dataIndex + 3] = a;
    }

    ctx.putImageData(imageData, 0, 0);

    // Convert to blob - using synchronous toDataURL then converting to Blob
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: 'image/png' });
}

/**
 * Convert PS2Icon animation data to AnimationData format.
 * Matches Python iconexport.py animation export logic.
 */
function convertAnimationData(icon: PS2Icon): AnimationData | undefined {
    const FIXED_POINT_FACTOR = 4096.0;
    const frameCount = icon.frames.length;

    // Python: if icon.anim_header.frame_count <= 1: (don't write animation)
    if (icon.animHeader.frameCount <= 1) {
        return undefined;
    }

    const animData = new AnimationData();
    animData.version = 2;
    animData.frameLength = icon.animHeader.frameLength;
    animData.animationSpeed = icon.animHeader.animSpeed;
    animData.playOffset = icon.animHeader.playOffset;

    // Python: for frame_index in range(frame_count):
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const keys: AnimationFrameKey[] = [];

        // Python: for key_index in range(icon.frames[frame_index].key_count):
        const ps2Frame = icon.frames[frameIndex];
        if (ps2Frame && ps2Frame.keys) {
            for (const key of ps2Frame.keys) {
                keys.push(new AnimationFrameKey(key.time, key.value));
            }
        }

        // If no keys were found, add a default key to prevent Timeline crash
        // This can happen when a frame has key_count=0
        if (keys.length === 0) {
            keys.push(new AnimationFrameKey(0, frameIndex === 0 ? 1 : 0));
        }

        // Extract vertex data for this frame
        // Python: v_from = frame_index * (icon.vertex_count * 3)
        //         v_to = (frame_index + 1) * (icon.vertex_count * 3)
        //         frame["vertexData"][i] = frame["vertexData"][i] / MAX_CONST (no coordinate flip!)
        const vertexData: number[] = [];
        const vFrom = frameIndex * icon.vertexCount * 3;
        const vTo = (frameIndex + 1) * icon.vertexCount * 3;
        for (let i = vFrom; i < vTo; i++) {
            vertexData.push(icon.vertexData[i] / FIXED_POINT_FACTOR);
        }

        animData.frames.push(new ModelAnimationFrame(keys, vertexData));
    }

    return animData;
}

