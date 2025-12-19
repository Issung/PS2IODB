/**
 * 3D viewer component for extracted PS2 icons.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PS2Icon, vertexToFloat } from './ps2icon';
import { IconSysData } from './ps2iconsys';
import { createMesh, getBackgroundGradient } from './iconToThree';
import './ExtractorViewer.scss';

type BackgroundMode = 'icon' | 'black' | 'white';
type LightingMode = 'icon' | 'none' | 'alt1' | 'alt2';

interface ExtractorViewerProps {
    icon: PS2Icon;
    iconSys?: IconSysData;
    iconName: string;
}

// Lighting configurations matching Python GUI
const LIGHTING_CONFIGS: Record<LightingMode, { ambient: number[]; lights: { dir: number[]; color: number[] }[] }> = {
    none: {
        ambient: [1.0, 1.0, 1.0],
        lights: []
    },
    icon: {
        // Will be overridden by icon.sys values
        ambient: [0.5, 0.5, 0.5],
        lights: [
            { dir: [1, -1, 2], color: [0.7, 0.7, 0.7] },
            { dir: [-1, 1, -2], color: [0.7, 0.7, 0.7] },
            { dir: [0, 1, 0], color: [0.3, 0.3, 0.3] }
        ]
    },
    alt1: {
        ambient: [0.5, 0.5, 0.5],
        lights: [
            { dir: [1, -1, 2], color: [1.0, 1.0, 1.0] },
            { dir: [-1, 1, -2], color: [1.0, 1.0, 1.0] },
            { dir: [0, 1, 0], color: [0.7, 0.7, 0.7] }
        ]
    },
    alt2: {
        ambient: [0.3, 0.3, 0.3],
        lights: [
            { dir: [1, -1, 2], color: [0.7, 0.7, 0.7] },
            { dir: [-1, 1, -2], color: [0.7, 0.7, 0.7] },
            { dir: [0, 4, 1], color: [0.2, 0.2, 0.2] }
        ]
    }
};

export function ExtractorViewer({ icon, iconSys, iconName }: ExtractorViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isAnimating, setIsAnimating] = useState(true);
    const [autoRotate, setAutoRotate] = useState(true);
    const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('icon');
    const [lightingMode, setLightingMode] = useState<LightingMode>('icon');

    // Store Three.js objects in refs to persist across renders
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const lightsRef = useRef<THREE.Light[]>([]);
    const animationFrameRef = useRef<number>(0);
    const animationStartTimeRef = useRef<number>(0);
    const iconRef = useRef<PS2Icon>(icon);
    const iconSysRef = useRef<IconSysData | undefined>(iconSys);

    // Update animation on each frame
    const updateAnimation = useCallback(() => {
        if (!isAnimating || !meshRef.current || iconRef.current.animationShapes <= 1) return;

        const icon = iconRef.current;
        const duration = icon.animHeader.frameLength;
        if (duration <= 0) return;

        const currentTime = (performance.now() - animationStartTimeRef.current) / 1000;
        const animTime = (currentTime * 8.0) % duration; // 8x speed like Python

        // Calculate shape weights from animation frames
        const shapeValues: Record<number, number> = {};

        for (const frame of icon.frames) {
            const keys = [...frame.keys];

            // Add initial key for shape 0
            if (frame.shapeId === 0) {
                keys.push({ time: 0, value: 1.0 });
            }

            // Find last and next keyframes
            let lastKey = null;
            let lastTime = 0;
            let nextKey = null;
            let nextTime = 0;

            for (const key of keys) {
                const t = key.time <= animTime ? key.time : key.time - duration;
                if (lastKey === null || t > lastTime) {
                    lastKey = key;
                    lastTime = t;
                }

                const tNext = key.time >= animTime ? key.time : key.time + duration;
                if (nextKey === null || tNext < nextTime) {
                    nextKey = key;
                    nextTime = tNext;
                }
            }

            // Interpolate
            let progress = 0;
            if (nextTime > lastTime) {
                progress = (animTime - lastTime) / (nextTime - lastTime);
            }

            if (lastKey && nextKey) {
                shapeValues[frame.shapeId] = (1.0 - progress) * lastKey.value + progress * nextKey.value;
            }
        }

        // Normalize shape values
        const sum = Object.values(shapeValues).reduce((a, b) => a + b, 0);
        if (sum <= 0) {
            shapeValues[0] = 1.0;
        } else {
            for (const key in shapeValues) {
                shapeValues[key] /= sum;
            }
        }

        // Update vertex positions
        const geometry = meshRef.current.geometry;
        const positions = geometry.getAttribute('position') as THREE.BufferAttribute;

        for (let i = 0; i < icon.vertexCount; i++) {
            let x = 0, y = 0, z = 0;

            for (const [shapeIdStr, weight] of Object.entries(shapeValues)) {
                const shapeId = parseInt(shapeIdStr);
                const offset = (shapeId * icon.vertexCount + i) * 3;
                x += weight * vertexToFloat(icon.vertexData[offset]);
                y += weight * vertexToFloat(icon.vertexData[offset + 1]);
                z += weight * vertexToFloat(icon.vertexData[offset + 2]);
            }

            // Apply PS2 coordinate conversion - flip Y and Z like in createGeometry
            positions.setXYZ(i, x, -y, -z);
        }

        positions.needsUpdate = true;
    }, [isAnimating]);

    // Update scene lighting
    const updateLighting = useCallback((scene: THREE.Scene, mode: LightingMode, iconSysData?: IconSysData) => {
        // Remove existing lights
        for (const light of lightsRef.current) {
            scene.remove(light);
        }
        lightsRef.current = [];

        // Get lighting config
        let config = LIGHTING_CONFIGS[mode];

        // If mode is 'icon' and we have iconSys data, use its lighting values
        if (mode === 'icon' && iconSysData) {
            const ambient = iconSysData.ambientLightColor;
            const lights = iconSysData.lightDirs.map((dir, i) => ({
                dir: [dir[0], dir[1], dir[2]],
                color: [
                    iconSysData.lightColors[i][0],
                    iconSysData.lightColors[i][1],
                    iconSysData.lightColors[i][2]
                ]
            }));
            config = {
                ambient: [ambient[0], ambient[1], ambient[2]],
                lights
            };
        }

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(
            new THREE.Color(config.ambient[0], config.ambient[1], config.ambient[2])
        );
        scene.add(ambientLight);
        lightsRef.current.push(ambientLight);

        // Add directional lights
        for (const lightConfig of config.lights) {
            const light = new THREE.DirectionalLight(
                new THREE.Color(lightConfig.color[0], lightConfig.color[1], lightConfig.color[2])
            );
            light.position.set(lightConfig.dir[0], lightConfig.dir[1], lightConfig.dir[2]);
            scene.add(light);
            lightsRef.current.push(light);
        }
    }, []);

    // Initialize Three.js scene
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const width = canvas.clientWidth || 400;
        const height = canvas.clientHeight || 400;

        // Create renderer
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        rendererRef.current = renderer;

        // Create scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Create camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(3, 2, 3);
        cameraRef.current = camera;

        // Create controls
        const controls = new OrbitControls(camera, canvas);
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 2;
        controls.enableDamping = true;
        controlsRef.current = controls;

        // Add initial lighting
        updateLighting(scene, lightingMode, iconSysRef.current);
        animationStartTimeRef.current = performance.now();

        // Animation loop
        const animate = () => {
            animationFrameRef.current = requestAnimationFrame(animate);
            updateAnimation();
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        setIsInitialized(true);

        // Handle resize with ResizeObserver for better performance
        const resizeObserver = new ResizeObserver(() => {
            const newWidth = canvas.clientWidth;
            const newHeight = canvas.clientHeight;
            if (newWidth > 0 && newHeight > 0) {
                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(newWidth, newHeight);
            }
        });
        resizeObserver.observe(canvas);

        // Cleanup
        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(animationFrameRef.current);
            renderer.dispose();
        };
    }, [autoRotate, updateAnimation]);

    // Load icon mesh when icon changes
    useEffect(() => {
        if (!isInitialized || !sceneRef.current) return;

        const scene = sceneRef.current;
        iconRef.current = icon;
        animationStartTimeRef.current = performance.now();

        // Remove old mesh
        if (meshRef.current) {
            scene.remove(meshRef.current);
            meshRef.current.geometry.dispose();
            if (meshRef.current.material instanceof THREE.Material) {
                meshRef.current.material.dispose();
            }
        }

        // Create new mesh
        const mesh = createMesh(icon, iconSys);
        scene.add(mesh);
        meshRef.current = mesh;

        // Center camera on mesh
        if (cameraRef.current && controlsRef.current) {
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            controlsRef.current.target.copy(center);
            cameraRef.current.position.set(
                center.x + maxDim * 1.5,
                center.y + maxDim,
                center.z + maxDim * 1.5
            );
            controlsRef.current.update();
        }

    }, [icon, iconSys, isInitialized]);

    // Update auto rotate
    useEffect(() => {
        if (controlsRef.current) {
            controlsRef.current.autoRotate = autoRotate;
        }
    }, [autoRotate]);

    // Update lighting when mode or iconSys changes
    useEffect(() => {
        if (!isInitialized || !sceneRef.current) return;
        iconSysRef.current = iconSys;
        updateLighting(sceneRef.current, lightingMode, iconSys);
    }, [lightingMode, iconSys, isInitialized, updateLighting]);

    const handleResetCamera = useCallback(() => {
        if (!cameraRef.current || !controlsRef.current || !meshRef.current) return;

        const box = new THREE.Box3().setFromObject(meshRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        controlsRef.current.target.copy(center);
        cameraRef.current.position.set(
            center.x + maxDim * 1.5,
            center.y + maxDim,
            center.z + maxDim * 1.5
        );
        controlsRef.current.update();
    }, []);

    // Compute background style based on mode
    const backgroundStyle = useMemo(() => {
        switch (backgroundMode) {
            case 'black':
                return '#000000';
            case 'white':
                return '#ffffff';
            case 'icon':
            default:
                return iconSys ? getBackgroundGradient(iconSys) : '#1a1a2e';
        }
    }, [backgroundMode, iconSys]);

    return (
        <div className="extractor-viewer" style={{ background: backgroundStyle }}>
            <div className="viewer-header">
                <span className="icon-name">{iconName}</span>
            </div>
            <div className="viewer-controls">
                <button
                    className={isAnimating ? 'active' : ''}
                    onClick={() => setIsAnimating(!isAnimating)}
                    title={isAnimating ? 'Pause Animation' : 'Play Animation'}
                >
                    {isAnimating ? '⏸' : '▶'}
                </button>
                <button
                    className={autoRotate ? 'active' : ''}
                    onClick={() => setAutoRotate(!autoRotate)}
                    title={autoRotate ? 'Stop Rotation' : 'Auto Rotate'}
                >
                    🔄
                </button>
                <button
                    onClick={handleResetCamera}
                    title="Reset Camera"
                >
                    🎯
                </button>
            </div>
            <div className="viewer-options">
                <div className="option-group">
                    <label>BG:</label>
                    <select value={backgroundMode} onChange={e => setBackgroundMode(e.target.value as BackgroundMode)}>
                        <option value="icon">Icon</option>
                        <option value="black">Black</option>
                        <option value="white">White</option>
                    </select>
                </div>
                <div className="option-group">
                    <label>Light:</label>
                    <select value={lightingMode} onChange={e => setLightingMode(e.target.value as LightingMode)}>
                        <option value="icon">Icon</option>
                        <option value="none">None</option>
                        <option value="alt1">Alt 1</option>
                        <option value="alt2">Alt 2</option>
                    </select>
                </div>
            </div>
            <canvas ref={canvasRef} className="viewer-canvas" />
            <div className="viewer-info">
                <span>Vertices: {icon.vertexCount}</span>
                <span>Shapes: {icon.animationShapes}</span>
                <span>Frames: {icon.animHeader.frameCount}</span>
            </div>
        </div>
    );
}

