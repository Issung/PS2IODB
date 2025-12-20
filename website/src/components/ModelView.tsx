import { useCallback, useEffect, useMemo, useState } from "react";
import { IconSys } from '../model/IconSys';
import { ModelRendererImpl } from "./ModelRendererImpl";
import './ModelView.scss';
import { BackgroundType, MeshType, TextureType } from "./ModelViewParams";
import { Utils } from "../utils/Utils";
import { ModelFiles, ModelSource, ResolvedModelAssets, resolveModelFiles, revokeModelAssets } from "./ModelSource";

// Re-export for convenience
export type { ModelSource, ModelFiles };

export interface ModelViewProps {
    /** The source of the model data - either URL-based or file-based. */
    source: ModelSource;

    /** Optional callback for when texture info is loaded (for external display). */
    onTextureInfo?: (textureName: string | undefined) => void;

    /** Optional: allow external control to hide controls (e.g., for embedding). */
    hideControls?: boolean;

    /** Optional: callback for download button (only for URL sources). */
    onDownload?: () => void;

    /** Optional: download button status text (e.g., "Loading..."). */
    downloadStatus?: string;
}

const renderer = new ModelRendererImpl();

export const ModelView = ({ source, onTextureInfo, hideControls, onDownload, downloadStatus }: ModelViewProps) => {
    // State for loaded data
    const [iconsys, setIconSys] = useState<IconSys | undefined>(undefined);
    const [loadError, setLoadError] = useState<string | undefined>(undefined);
    const [resolvedAssets, setResolvedAssets] = useState<ResolvedModelAssets | undefined>(undefined);

    // State for model info (from renderer callback)
    const [frameCount, setFrameCount] = useState(0);
    const [textureName, setTextureName] = useState<string | undefined>(undefined);

    // Control state
    const [variant, setVariant] = useState<string | undefined>(undefined);
    const [doAnimation, setDoAnimation] = useState(true);
    const [animationSpeed, setAnimationSpeed] = useState(1);
    const [frame, setFrame] = useState(0);
    const [grid, setGrid] = useState(true);
    const [textureType, setTextureType] = useState(TextureType.Icon);
    const [meshType, setMeshType] = useState(MeshType.Mesh);
    const [backgroundType, setBackgroundType] = useState(BackgroundType.Icon);
    const [backgroundColor, setBackgroundColor] = useState('#080808');

    // Derived state
    const iconHasBackgroundColorData = useMemo(() => {
        return iconsys !== undefined && iconsys.bgColBL !== undefined;
    }, [iconsys]);

    const variants = useMemo(() => {
        if (iconsys) {
            return Array.from(new Set([iconsys.normal, iconsys.copy, iconsys.delete]));
        }
        if (resolvedAssets) {
            return resolvedAssets.variants;
        }
        return [];
    }, [iconsys, resolvedAssets]);

    // Callback for renderer to report info back
    const iconInfoCallback = useCallback((newFrameCount: number, newTextureName: string | undefined) => {
        setFrameCount(newFrameCount);
        setTextureName(newTextureName);
        onTextureInfo?.(newTextureName);
    }, [onTextureInfo]);

    // Initialize renderer
    useEffect(() => {
        renderer.initialise();
        return renderer.dispose;
    }, []);

    // Load icon data based on source type
    useEffect(() => {
        const cancelRef = { cancelled: false };
        setLoadError(undefined);

        if (source.type === 'url') {
            // URL-based loading: fetch iconsys.json
            fetchIconSys(source.iconcode, cancelRef);
        } else {
            // File-based loading: resolve files to assets
            loadFromFiles(source.files, cancelRef);
        }

        // Cleanup function - clear model and revoke blob URLs
        // This is important for React StrictMode which unmounts/remounts
        return () => {
            cancelRef.cancelled = true;
            renderer.clearScene();
            if (resolvedAssets) {
                revokeModelAssets(resolvedAssets);
            }
        };
    }, [source]);

    async function fetchIconSys(iconcode: string, cancelRef: { cancelled: boolean }) {
        try {
            const url = `/icons/${iconcode}/iconsys.json`;
            const response = await fetch(url);
            if (cancelRef.cancelled) return; // Don't update state if effect was cleaned up

            const text = await response.text();

            if (text.startsWith('{')) {
                const tmpiconsys = JSON.parse(text) as IconSys;
                setIconSys(tmpiconsys);
                setVariant(tmpiconsys.normal);
                setBackgroundType(tmpiconsys.bgColBL ? BackgroundType.Icon : BackgroundType.Color);
            } else {
                throw new Error(`IconSys JSON response did not start with '{'.`);
            }
        } catch (e) {
            if (cancelRef.cancelled) return;
            if (e instanceof Error) {
                setLoadError('Error loading icon data. ' + e.message);
            }
        }
    }

    async function loadFromFiles(files: ModelFiles, cancelRef: { cancelled: boolean }) {
        try {
            const assets = await resolveModelFiles(files);
            if (cancelRef.cancelled) return; // Don't update state if effect was cleaned up

            setResolvedAssets(assets);
            setIconSys(assets.iconSys);
            setVariant(assets.currentVariant);
            setBackgroundType(assets.iconSys?.bgColBL ? BackgroundType.Icon : BackgroundType.Color);
        } catch (e) {
            if (cancelRef.cancelled) return;
            if (e instanceof Error) {
                setLoadError('Error loading files. ' + e.message);
            }
        }
    }

    // Effect for URL-based loading: load icon into renderer when iconsys is ready
    useEffect(() => {
        if (source.type === 'url' && iconsys) {
            renderer.prop_callback = iconInfoCallback;
            renderer.loadNewIcon(source.iconcode, iconsys);
        }
    }, [source, iconsys, iconInfoCallback]);

    // Effect for file-based loading: load into renderer when resolvedAssets is ready
    useEffect(() => {
        if (source.type === 'files' && resolvedAssets) {
            renderer.prop_callback = iconInfoCallback;
            renderer.loadFromAssets(resolvedAssets);
        }
    }, [source, resolvedAssets, iconInfoCallback]);

    // Effect for URL-based variant/texture changes
    useEffect(() => {
        renderer.prop_callback = iconInfoCallback;
        if (source.type === 'url' && variant) {
            renderer.loadVariant(variant, textureType);
        }
    }, [source, variant, textureType, iconInfoCallback]);

    // Effect for file-based variant changes: re-resolve files with new variant
    useEffect(() => {
        if (source.type !== 'files' || !variant || !resolvedAssets) return;

        // Skip if this is the initial variant (already loaded by loadFromFiles)
        if (variant === resolvedAssets.currentVariant) return;

        const cancelRef = { cancelled: false };

        (async () => {
            try {
                // Revoke old blob URLs before creating new ones
                revokeModelAssets(resolvedAssets);

                // Re-resolve with new variant
                const newAssets = await resolveModelFiles(source.files, variant);
                if (cancelRef.cancelled) {
                    revokeModelAssets(newAssets);
                    return;
                }

                setResolvedAssets(newAssets);
                // Note: The file-based loading effect above will handle loading into renderer
            } catch (e) {
                if (cancelRef.cancelled) return;
                console.error('Error switching variant:', e);
            }
        })();

        return () => {
            cancelRef.cancelled = true;
        };
    }, [source, variant]);

    // Effect for view options (doesn't require loading new assets)
    useEffect(() => {
        renderer.prop_animate = doAnimation;
        renderer.prop_animationSpeed = animationSpeed;
        renderer.prop_frame = frame;
        renderer.prop_grid = grid;
        renderer.prop_meshType = meshType;
    }, [doAnimation, animationSpeed, frame, grid, meshType]);

    // Background color computation
    const color = useMemo(() => {
        if (backgroundType === BackgroundType.Icon && iconsys?.bgColTL) {
            const tl = iconsys.bgColTL;
            const tr = iconsys.bgColTR!;
            const bl = iconsys.bgColBL!;
            const br = iconsys.bgColBR!;
            const middle = Utils.averageColor([tl, tr, bl, br]);
            return `linear-gradient(to top left, ${br}, transparent, ${tl}), linear-gradient(to top right, ${bl}, transparent, ${tr}) ${middle}`;
        }
        return `linear-gradient(to top left, ${backgroundColor}, ${backgroundColor})`;
    }, [backgroundType, backgroundColor, iconsys]);

    console.log('ModelView', { source });

    return (
        <div id="model-view">
            <canvas
                id="iconRenderCanvas"
                style={{
                    transition: 'background 2s',
                    background: color
                }}
            />

            {loadError && <code className="model-view-error">{loadError}</code>}

            {!hideControls && iconsys && (
                <div className="model-view-controls">
                    <ul>
                        {frameCount > 0 && (
                            <li>
                                <label>Animate
                                    <input type="checkbox" checked={doAnimation} onChange={e => setDoAnimation(e.target.checked)}/>
                                </label>
                            </li>
                        )}
                        {frameCount > 0 && doAnimation && (
                            <li>
                                <label>
                                    <span onClick={() => setAnimationSpeed(1)} title="Animation playback speed multiplier. Click label to reset to 1x.">
                                        Speed
                                    </span>
                                    <output style={{marginLeft: '5px', minWidth: 50}}>({animationSpeed}x)</output>
                                    <input type="range" min="0.01" max="5" step="0.01" value={animationSpeed} onChange={e => setAnimationSpeed(parseFloat(e.target.value))}/>
                                </label>
                            </li>
                        )}
                        {frameCount > 0 && !doAnimation && (
                            <li>
                                <label>Frame
                                    <output style={{marginLeft: '5px', minWidth: 25}}>{frame + 1}/{frameCount}</output>
                                    <input type="range" min={0} max={frameCount - 1} value={frame} onChange={e => setFrame(parseInt(e.target.value))}/>
                                </label>
                            </li>
                        )}
                        <li>
                            <label>Display Grid
                                <input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)}/>
                            </label>
                        </li>
                        <li>
                            <label title={iconHasBackgroundColorData ? "Alter the background display." : "We do not have background color data for this icon yet."}>
                                Background
                                <select
                                    value={backgroundType}
                                    onChange={e => setBackgroundType(e.target.value as BackgroundType)}
                                    disabled={!iconHasBackgroundColorData}
                                >
                                    {Object.values(BackgroundType).map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </label>
                        </li>
                        {backgroundType === BackgroundType.Color && (
                            <li>
                                <label>Background Color
                                    <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} />
                                </label>
                            </li>
                        )}
                        {variants.length > 1 && (
                            <li>
                                <label>Icon Variant
                                    <select value={variant} onChange={e => setVariant(e.target.value)}>
                                        {variants.map(val => (
                                            <option value={val} key={val}>{val}</option>
                                        ))}
                                    </select>
                                </label>
                            </li>
                        )}
                        {source.type === 'url' && (
                            <li>
                                <label>Material
                                    <select value={textureType} onChange={e => setTextureType(e.target.value as TextureType)}>
                                        {Object.values(TextureType).map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </label>
                            </li>
                        )}
                        <li>
                            <label>Mesh
                                <select value={meshType} onChange={e => setMeshType(e.target.value as MeshType)}>
                                    {Object.values(MeshType).map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </label>
                        </li>
                        {onDownload && (
                            <li>
                                <button onClick={onDownload} disabled={!!downloadStatus}>
                                    {downloadStatus ?? 'Download Icon Assets ⬇️'}
                                </button>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};