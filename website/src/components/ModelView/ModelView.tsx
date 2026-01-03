import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconSys } from '../../model/IconSys';
import { Utils } from "../../utils/Utils";
import { ModelLoader, ResolvedModelAssets } from "./ModelLoader";
import './ModelView.scss';
import { BackgroundType, MeshType, TextureType } from "./ModelViewParams";
import { ModelViewRenderer } from "./ModelViewRenderer";

export interface ModelViewProps {
    /** The loader to use for fetching model data. */
    loader: ModelLoader;

    /** Optional: allow external control to hide controls (e.g., for embedding). */
    hideControls?: boolean;

    /** Optional: callback for download button (only for URL sources). */
    onDownload?: () => void;

    /** Optional: download button status text (e.g., "Loading..."). */
    downloadStatus?: string;
}

const renderer = new ModelViewRenderer();

export const ModelView = ({ loader, hideControls, onDownload, downloadStatus }: ModelViewProps) => {
    // State for loaded data
    const [iconsys, setIconSys] = useState<IconSys | undefined>(undefined);
    const [loadError, setLoadError] = useState<string | undefined>(undefined);
    const [resolvedAssets, setResolvedAssets] = useState<ResolvedModelAssets | undefined>(undefined);
    const [variants, setVariants] = useState<string[]>([]);

    // State for model info (from renderer callback)
    const [frameCount, setFrameCount] = useState(0);
    const [textureName, setTextureName] = useState<string | undefined>(undefined);

    // Texture preview state
    const [enlargeTextureView, setEnlargeTextureView] = useState(false);
    const [imageRotationDegrees, setImageRotationDegrees] = useState(0);
    const [imageFlip, setImageFlip] = useState(false);

    // Track whether next asset load should reset camera (false when switching variants)
    const shouldResetCameraRef = useRef(true);

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

    // Callback for renderer to report info back
    const iconInfoCallback = useCallback((newFrameCount: number, newTextureName: string | undefined) => {
        setFrameCount(newFrameCount);
        setTextureName(newTextureName);
    }, []);

    // Reset texture preview state when loader changes
    useEffect(() => {
        setEnlargeTextureView(false);
        setImageRotationDegrees(0);
        setImageFlip(false);
    }, [loader]);

    /** Close texture view if clicking outside the image/buttons */
    function maybeCloseTextureView(event: React.MouseEvent<HTMLElement, MouseEvent>) {
        const targetNode = event.target as HTMLElement;
        const allowedTypes = ['BUTTON', 'IMG'];
        if (allowedTypes.indexOf(targetNode.nodeName) === -1) {
            setEnlargeTextureView(false);
        }
    }

    // Initialize renderer
    useEffect(() => {
        renderer.initialise();
        return renderer.dispose;
    }, []);

    // Effect: Initialize loader and load default variant
    useEffect(() => {
        const cancelRef = { cancelled: false };
        setLoadError(undefined);

        (async () => {
            try {
                if (cancelRef.cancelled) return;

                // Get metadata from the loader
                const iconSysData = loader.getIconSys();
                const variantList = loader.getVariants();
                const defaultVariant = loader.getDefaultVariant();

                setIconSys(iconSysData);
                setVariants(variantList);
                setVariant(defaultVariant);
                setBackgroundType(iconSysData.bgColBL ? BackgroundType.Icon : BackgroundType.Color);

                // Load the default variant - reset camera on initial load
                shouldResetCameraRef.current = true;
                const assets = await loader.loadVariant(defaultVariant);
                if (cancelRef.cancelled) return;

                setResolvedAssets(assets);
            } catch (e) {
                if (cancelRef.cancelled) return;
                if (e instanceof Error) {
                    setLoadError('Error loading model. ' + e.message);
                }
            }
        })();

        // Cleanup function
        return () => {
            cancelRef.cancelled = true;
            renderer.clearScene();
            loader.dispose();
        };
    }, [loader]);

    // Effect: Load assets into renderer when resolvedAssets changes
    useEffect(() => {
        if (!resolvedAssets) return;

        renderer.prop_callback = iconInfoCallback;
        const resetCamera = shouldResetCameraRef.current;
        shouldResetCameraRef.current = true; // Reset for next load
        renderer.loadFromAssets(resolvedAssets, textureType, resetCamera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedAssets, iconInfoCallback]); // textureType excluded - handled by texture effect

    // Effect: Handle variant changes (after initial load)
    useEffect(() => {
        if (!variant || !resolvedAssets) return;

        // Skip if this is the current variant (already loaded)
        if (variant === resolvedAssets.currentVariant) return;

        const cancelRef = { cancelled: false };

        (async () => {
            try {
                const assets = await loader.loadVariant(variant);
                if (cancelRef.cancelled) return;

                // Don't reset camera when switching variants
                shouldResetCameraRef.current = false;
                setResolvedAssets(assets);
            } catch (e) {
                if (cancelRef.cancelled) return;
                console.error('Error switching variant:', e);
            }
        })();

        return () => {
            cancelRef.cancelled = true;
        };
    }, [loader, variant, resolvedAssets]);

    // Effect: Handle texture type changes
    useEffect(() => {
        if (!resolvedAssets) {
            return;
        }
        renderer.changeTextureType(textureType, resolvedAssets.textureBlobUrl);
    }, [textureType]);

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

    //console.log('ModelView', { loader });

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
                        <li>
                            <label>Material
                                <select value={textureType} onChange={e => setTextureType(e.target.value as TextureType)}>
                                    {Object.values(TextureType).map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </label>
                        </li>
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

            {/* Texture preview thumbnail */}
            {!hideControls && textureName && resolvedAssets && (
                <div className="texture-details">
                    <img
                        onClick={() => setEnlargeTextureView(true)}
                        src={resolvedAssets.textureBlobUrl}
                        title={`Icon texture image.`}
                        style={{transform: `rotate(${imageRotationDegrees}deg)`}}
                    />
                </div>
            )}

            {/* Enlarged texture modal */}
            {enlargeTextureView && resolvedAssets && (
                <div className="enlarged-texture-view container-fluid">
                    <div className="row">
                        <div className="d-flex flex-column justify-content-center align-items-center" onClick={e => maybeCloseTextureView(e)}>
                            <a title={`Icon texture image.`}>
                                <img
                                    src={resolvedAssets.textureBlobUrl}
                                    style={{transform: `scale(${imageFlip ? -1 : 1}, 1) rotate(${imageRotationDegrees}deg)`}}
                                />
                            </a>
                        </div>
                    </div>
                    <div className="row justify-content-center align-items-center" onClick={e => maybeCloseTextureView(e)}>
                        <div className="col-4 col-md-3 col-xl-2 col-xxl-1">
                            <button
                                className="mx-auto d-block"
                                title="Rotate image 90 degrees anti-clockwise"
                                onClick={() => setImageRotationDegrees(imageRotationDegrees - 90)}
                            >
                                {imageFlip ? '↻' : '↺'}
                            </button>
                        </div>
                        <div className="col-4 col-md-3 col-xl-2 col-xxl-1">
                            <button
                                className="mx-auto d-block"
                                title="Mirror image vertically"
                                onClick={() => setImageFlip(!imageFlip)}
                            >
                                Mirror
                            </button>
                        </div>
                        <div className="col-4 col-md-3 col-xl-2 col-xxl-1">
                            <button
                                className="mx-auto d-block"
                                title="Rotate image 90 degrees clockwise"
                                onClick={() => setImageRotationDegrees(imageRotationDegrees + 90)}
                            >
                                {imageFlip ? '↺' : '↻'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};