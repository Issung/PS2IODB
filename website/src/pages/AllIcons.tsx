import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IconSys } from '../model/IconSys';
import { ContributedIcons } from '../model/Titles';
import './AllIcons.scss';

// Store references for screenshot functionality
let screenshotRenderer: THREE.WebGLRenderer | null = null;
let screenshotScene: THREE.Scene | null = null;
let screenshotCamera: THREE.OrthographicCamera | null = null;

/**
 * Development-only page that displays all icons in a 3D grid.
 * Uses orthographic camera for screenshot purposes.
 */
const AllIcons = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<string>('Loading icon list...');
    const [loadedCount, setLoadedCount] = useState<number>(0);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [isCapturing, setIsCapturing] = useState<boolean>(false);

    const handleScreenshot = useCallback(() => {
        if (!screenshotRenderer || !screenshotScene || !screenshotCamera || isCapturing) return;

        setIsCapturing(true);
        setStatus('Capturing 8K screenshot...');

        // 8K resolution (7680 x 4320 for 16:9)
        const width = 7680;
        const height = 4320;

        // Create a new renderer for high-res capture
        const captureRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        captureRenderer.setSize(width, height);
        captureRenderer.setPixelRatio(1);

        // Render the scene
        captureRenderer.render(screenshotScene, screenshotCamera);

        // Convert to image and download
        const dataUrl = captureRenderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `all-icons-8k-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();

        // Cleanup
        captureRenderer.dispose();
        setIsCapturing(false);
        setStatus('All icons loaded!');
    }, [isCapturing]);

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0, 0, 0);

        // Calculate grid dimensions for 16:9 aspect ratio
        const aspectRatio = 16 / 9;
        const viewWidth = 100;
        const viewHeight = viewWidth / aspectRatio;

        // Orthographic camera for flat 2D-like view
        const camera = new THREE.OrthographicCamera(
            -viewWidth / 2, viewWidth / 2,
            viewHeight / 2, -viewHeight / 2,
            0.1, 1000
        );
        camera.position.set(0, 0, -50);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Store references for screenshot
        screenshotRenderer = renderer;
        screenshotScene = scene;
        screenshotCamera = camera;

        // No lights needed - we'll use MeshBasicMaterial for fullbright rendering

        // Add OrbitControls for pan/zoom
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableRotate = false; // Disable rotation for 2D view
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.screenSpacePanning = true;
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        let animationId: number;

        const animate = () => {
            animationId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);

        // Fetch and load all icons
        loadAllIcons(scene, camera, setStatus, setLoadedCount, setTotalCount);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            controls.dispose();
            renderer.dispose();
            screenshotRenderer = null;
            screenshotScene = null;
            screenshotCamera = null;
        };
    }, []);

    return (
        <div id="AllIcons">
            <div className="status-bar">
                <span>{status}</span>
                {totalCount > 0 && <span> ({loadedCount}/{totalCount})</span>}
                <button
                    className="screenshot-btn"
                    onClick={handleScreenshot}
                    disabled={isCapturing || loadedCount < totalCount}
                >
                    📷 Save 8K Screenshot
                </button>
            </div>
            <canvas ref={canvasRef} id="allIconsCanvas" />
        </div>
    );
};

async function loadAllIcons(
    scene: THREE.Scene,
    camera: THREE.OrthographicCamera,
    setStatus: (s: string) => void,
    setLoadedCount: (n: number) => void,
    setTotalCount: (n: number) => void
) {
    try {
        // Get icon codes from the global Icons array
        const iconCodes = ContributedIcons.map(i => i.code!);
        setTotalCount(iconCodes.length);
        setStatus(`Loading ${iconCodes.length} icons...`);

        // Calculate grid dimensions
        const cols = Math.ceil(Math.sqrt(iconCodes.length * (16 / 9)));
        const rows = Math.ceil(iconCodes.length / cols);

        // Icon spacing
        const spacingX = 2.5;
        const spacingY = 2.5;
        const gridWidth = cols * spacingX;
        const gridHeight = rows * spacingY;

        // Adjust camera to fit the grid
        const padding = 1.2;
        camera.left = -gridWidth * padding / 2;
        camera.right = gridWidth * padding / 2;
        camera.top = gridHeight * padding / 2;
        camera.bottom = -gridHeight * padding / 2;
        camera.updateProjectionMatrix();

        let loaded = 0;
        const loadedObjects: (THREE.Group | null)[] = new Array(iconCodes.length).fill(null);

        // Use concurrency limit to avoid ERR_INSUFFICIENT_RESOURCES
        const concurrencyLimit = 200;
        let currentIndex = 0;

        const loadNext = async (): Promise<void> => {
            while (currentIndex < iconCodes.length) {
                const index = currentIndex++;
                const code = iconCodes[index];
                const col = index % cols;
                const row = Math.floor(index / cols);

                const x = (col - cols / 2 + 0.5) * spacingX;
                const y = -(row - rows / 2 + 0.5) * spacingY;

                const object = await loadSingleIcon(code, x, y);
                loadedObjects[index] = object;
                loaded++;

                // Update count periodically
                if (loaded % 50 === 0 || loaded === iconCodes.length) {
                    setLoadedCount(loaded);
                }
            }
        };

        // Start concurrent workers
        const workers: Promise<void>[] = [];
        for (let i = 0; i < concurrencyLimit; i++) {
            workers.push(loadNext());
        }
        await Promise.all(workers);

        // Add all objects to scene at once to avoid race conditions
        setStatus('Adding icons to scene...');
        for (const obj of loadedObjects) {
            if (obj) {
                scene.add(obj);
            }
        }

        setLoadedCount(loaded);
        setStatus('All icons loaded!');
    } catch (error) {
        setStatus(`Error: ${error}`);
        console.error(error);
    }
}

async function loadSingleIcon(
    code: string,
    x: number,
    y: number
): Promise<THREE.Group | null> {
    try {
        // Fetch iconsys.json
        const iconSysResponse = await fetch(`/icons/${code}/iconsys.json`);
        if (!iconSysResponse.ok) return null;

        const iconSys: IconSys = await iconSysResponse.json();
        const normalIcon = iconSys.normal;

        // Build file paths
        const baseUrl = `/icons/${code}`;
        const objUrl = `${baseUrl}/${normalIcon}.obj`;

        // Fetch OBJ to get MTL reference
        const objResponse = await fetch(objUrl);
        if (!objResponse.ok) return null;

        const objContent = await objResponse.text();

        // Parse MTL filename from OBJ
        const mtllibLine = objContent.split('\n').find(l => l.startsWith('mtllib '));
        const mtlFilename = mtllibLine?.substring('mtllib '.length).trim();
        if (!mtlFilename) return null;

        // Load materials
        const mtlLoader = new MTLLoader();
        mtlLoader.setPath(`${baseUrl}/`);

        return new Promise((resolve) => {
            mtlLoader.load(mtlFilename, (materials) => {
                materials.preload();

                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);

                objLoader.load(objUrl, (object) => {
                    // Scale and position the icon
                    const box = new THREE.Box3().setFromObject(object);
                    const size = new THREE.Vector3();
                    box.getSize(size);
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = 1.8 / maxDim; // Fit within cell

                    object.scale.set(scale, scale, scale);

                    // Center the object
                    const center = new THREE.Vector3();
                    box.getCenter(center);
                    object.position.set(
                        x - center.x * scale,
                        y - center.y * scale,
                        -center.z * scale
                    );

                    // Convert all materials to MeshBasicMaterial for fullbright rendering
                    object.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            const oldMaterial = child.material as THREE.MeshPhongMaterial;
                            const newMaterial = new THREE.MeshBasicMaterial();
                            const geometry = child.geometry as THREE.BufferGeometry;

                            // Copy texture if exists
                            if (oldMaterial.map) {
                                newMaterial.map = oldMaterial.map;
                                newMaterial.map.colorSpace = THREE.SRGBColorSpace;
                            }

                            // PS2 icons use vertex colors multiplied with texture
                            // Apply adaptive boost based on how dark the icon's colors are
                            if (geometry.attributes.color) {
                                newMaterial.vertexColors = true;

                                const colors = geometry.attributes.color;

                                // First pass: calculate average brightness
                                let totalBrightness = 0;
                                for (let i = 0; i < colors.count; i++) {
                                    const r = colors.getX(i);
                                    const g = colors.getY(i);
                                    const b = colors.getZ(i);
                                    // Use perceived brightness formula
                                    totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
                                }
                                const avgBrightness = totalBrightness / colors.count;

                                // Calculate adaptive boost to normalize to target brightness
                                // Target ~0.7 brightness, but cap the boost to avoid extreme values
                                const targetBrightness = 0.7;
                                const minBoost = 1.0;
                                const maxBoost = 5.0;
                                let boost = avgBrightness > 0.01
                                    ? targetBrightness / avgBrightness
                                    : maxBoost;
                                boost = Math.max(minBoost, Math.min(maxBoost, boost));

                                // Second pass: apply the boost
                                const boostedColors = new Float32Array(colors.count * colors.itemSize);
                                for (let i = 0; i < colors.count; i++) {
                                    const r = colors.getX(i);
                                    const g = colors.getY(i);
                                    const b = colors.getZ(i);

                                    boostedColors[i * colors.itemSize] = Math.min(1, r * boost);
                                    boostedColors[i * colors.itemSize + 1] = Math.min(1, g * boost);
                                    boostedColors[i * colors.itemSize + 2] = Math.min(1, b * boost);

                                    // Copy alpha if present
                                    if (colors.itemSize > 3) {
                                        boostedColors[i * colors.itemSize + 3] = colors.getW(i);
                                    }
                                }

                                geometry.setAttribute('color', new THREE.BufferAttribute(boostedColors, colors.itemSize));
                            }

                            // Copy transparency settings
                            newMaterial.transparent = oldMaterial.transparent;
                            newMaterial.opacity = oldMaterial.opacity;
                            newMaterial.side = oldMaterial.side;

                            child.material = newMaterial;
                            oldMaterial.dispose();
                        }
                    });

                    resolve(object);
                }, undefined, () => resolve(null));
            }, undefined, () => resolve(null));
        });
    } catch {
        // Silently ignore individual icon load errors
        return null;
    }
}

export default AllIcons;

