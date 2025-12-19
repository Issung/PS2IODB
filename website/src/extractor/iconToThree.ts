/**
 * Convert PS2 icon data to Three.js geometry.
 */

import * as THREE from 'three';
import { PS2Icon, TEXTURE_WIDTH, TEXTURE_HEIGHT, vertexToFloat, textureToRGBA } from './ps2icon';
import { IconSysData } from './ps2iconsys';

// Fixed point factor for PS2 icon coordinates (same as Python)
const FIXED_POINT_FACTOR = 4096.0;

/**
 * Create a Three.js BufferGeometry from a PS2 icon.
 * @param icon The parsed PS2 icon data.
 * @param shapeIndex Which animation shape to use (0 for first/default).
 */
export function createGeometry(icon: PS2Icon, shapeIndex: number = 0): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    const vertexCount = icon.vertexCount;

    // Create position array (shape vertices)
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const colors = new Float32Array(vertexCount * 4);

    for (let i = 0; i < vertexCount; i++) {
        // Get vertex position for the specified shape
        // Apply PS2 coordinate conversion: vec3(1.0, -1.0, -1.0) like Python shader
        const vertexOffset = (shapeIndex * vertexCount + i) * 3;
        const x = vertexToFloat(icon.vertexData[vertexOffset]);
        const y = vertexToFloat(icon.vertexData[vertexOffset + 1]);
        const z = vertexToFloat(icon.vertexData[vertexOffset + 2]);

        // PS2 uses different coordinate system - flip Y and Z
        positions[i * 3] = x;
        positions[i * 3 + 1] = -y;  // Flip Y
        positions[i * 3 + 2] = -z;  // Flip Z

        // Normals - also flip Y and Z
        const nx = vertexToFloat(icon.normalData[i * 3]);
        const ny = vertexToFloat(icon.normalData[i * 3 + 1]);
        const nz = vertexToFloat(icon.normalData[i * 3 + 2]);
        normals[i * 3] = nx;
        normals[i * 3 + 1] = -ny;
        normals[i * 3 + 2] = -nz;

        // UVs - convert from fixed point (divide by 4096 like Python shader)
        // UV data is stored as signed 16-bit integers in fixed point format
        uvs[i * 2] = icon.uvData[i * 2] / FIXED_POINT_FACTOR;
        uvs[i * 2 + 1] = icon.uvData[i * 2 + 1] / FIXED_POINT_FACTOR;

        // Colors - normalize to 0-1
        colors[i * 4] = icon.colorData[i * 4] / 255;
        colors[i * 4 + 1] = icon.colorData[i * 4 + 1] / 255;
        colors[i * 4 + 2] = icon.colorData[i * 4 + 2] / 255;
        colors[i * 4 + 3] = icon.colorData[i * 4 + 3] / 128; // PS2 alpha is 0-128
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));

    // Compute bounding box for camera positioning
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
}

/**
 * Create a Three.js texture from PS2 icon texture data.
 * @param icon The parsed PS2 icon data.
 */
export function createTexture(icon: PS2Icon): THREE.DataTexture {
    const rgba = textureToRGBA(icon.texture);
    
    const texture = new THREE.DataTexture(
        rgba,
        TEXTURE_WIDTH,
        TEXTURE_HEIGHT,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
    );
    
    texture.flipY = false; // PS2 textures are typically not flipped
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    
    // Set texture wrapping and filtering
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    return texture;
}

/**
 * Create a Three.js material for a PS2 icon.
 * @param icon The parsed PS2 icon data.
 * @param iconSys Optional icon.sys data for lighting configuration.
 */
export function createMaterial(icon: PS2Icon, iconSys?: IconSysData): THREE.MeshPhongMaterial {
    const texture = createTexture(icon);
    
    const material = new THREE.MeshPhongMaterial({
        map: texture,
        vertexColors: true,
        side: THREE.FrontSide,
        transparent: true,
    });
    
    return material;
}

/**
 * Create a complete Three.js mesh from a PS2 icon.
 * @param icon The parsed PS2 icon data.
 * @param iconSys Optional icon.sys data for lighting configuration.
 * @param shapeIndex Which animation shape to use.
 */
export function createMesh(icon: PS2Icon, iconSys?: IconSysData, shapeIndex: number = 0): THREE.Mesh {
    const geometry = createGeometry(icon, shapeIndex);
    const material = createMaterial(icon, iconSys);
    
    const mesh = new THREE.Mesh(geometry, material);
    
    return mesh;
}

/**
 * Create a Three.js Group containing all animation shapes of an icon.
 * Only the first shape is visible by default.
 */
export function createAnimatedMesh(icon: PS2Icon, iconSys?: IconSysData): THREE.Group {
    const group = new THREE.Group();
    
    for (let i = 0; i < icon.animationShapes; i++) {
        const mesh = createMesh(icon, iconSys, i);
        mesh.visible = i === 0; // Only show first shape initially
        mesh.name = `shape_${i}`;
        group.add(mesh);
    }
    
    return group;
}

/**
 * Get background gradient style from icon.sys data.
 */
export function getBackgroundGradient(iconSys: IconSysData): string {
    const toHex = (color: number[]): string => {
        const r = Math.min(255, color[0]);
        const g = Math.min(255, color[1]);
        const b = Math.min(255, color[2]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    const tl = toHex(iconSys.bgColors[0]);
    const tr = toHex(iconSys.bgColors[1]);
    const bl = toHex(iconSys.bgColors[2]);
    const br = toHex(iconSys.bgColors[3]);

    // Create a gradient that approximates the 4-corner gradient
    return `linear-gradient(135deg, ${tl} 0%, ${tr} 50%, ${bl} 50%, ${br} 100%)`;
}

