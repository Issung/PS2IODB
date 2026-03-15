import { IconDownload, IconFlipVertical, IconInfoCircle, IconRotate2, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { IconSys } from '../../model/IconSys';
import { Utils } from "../../utils/Utils";
import { Category } from "../FilterSelectCategory";
import { Modal } from "../Modal";
import { IconState, ModelLoader, ResolvedModelAssets } from "./ModelLoader";
import './ModelView.scss';
import { BackgroundType, BaseType, MeshType, TextureType } from "./ModelViewParams";
import { ModelViewRenderer } from "./ModelViewRenderer";
import { AnimationVersion } from '../../model/AnimationVersion';

export interface ModelViewProps {
    /** The loader to use for fetching model data. */
    loader: ModelLoader;

    /** Optional: allow external control to hide controls (e.g., for embedding). */
    hideControls?: boolean;

    /** Optional: callback for download button (only for URL sources). */
    onDownload?: () => void;

    /** Optional: download button status text (e.g., "Loading..."). */
    downloadStatus?: string;

    /**
     * Whether the ModelView is displayed fullscreen (e.g., on Icon page).
     * When true, modals portal to document.body to escape parent stacking contexts.
     * When false (default), modals stays within the component bounds.
     */
    fullscreen?: boolean;

    /**
     * Whether this icon has a static animation (animation data exists but all frames are identical).
     * When true, shows a grey underline on the Animate label with different modal text.
     */
    isStaticAnimation?: boolean;
}

const renderer = new ModelViewRenderer();

const brokenAnimationsPath = `/browse/category/${Category.brokenAnimation}#browse`;

export const ModelView = ({ loader, hideControls, onDownload, downloadStatus, fullscreen = false, isStaticAnimation = false }: ModelViewProps) => {
    // State for loaded data
    const [iconsys, setIconSys] = useState<IconSys | undefined>(undefined);
    const [loadError, setLoadError] = useState<string | undefined>(undefined);
    const [resolvedAssets, setResolvedAssets] = useState<ResolvedModelAssets | undefined>(undefined);
    const [states, setStates] = useState<IconState[]>([]);

    // State for model info (from renderer callback)
    const [frameCount, setFrameCount] = useState(0);
    const [textureName, setTextureName] = useState<string | undefined>(undefined);
    const [animationVersion, setAnimationVersion] = useState<AnimationVersion>(null);
    const [vertexCount, setVertexCount] = useState(0);
    const [triangleCount, setTriangleCount] = useState(0);
    const animationOutdated = animationVersion === 1;

    // Texture preview state
    const [enlargeTextureView, setEnlargeTextureView] = useState(false);
    const [imageRotationDegrees, setImageRotationDegrees] = useState(0);
    const [imageFlip, setImageFlip] = useState(false);

    // Animation warning modal state
    const [showAnimationModal, setShowAnimationModal] = useState(false);

    // Details modal state
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Track whether next asset load should reset camera (false when switching states)
    const shouldResetCameraRef = useRef(true);

    // Determine the portal target: document.body when fullscreen, local container otherwise
    const portalTarget: HTMLElement = fullscreen ? document.body : document.querySelector('div#model-view')!;

    // Control state
    const [selectedState, setSelectedState] = useState<IconState | undefined>(undefined);
    const [doAnimation, setDoAnimation] = useState(true);
    const [animationSpeed, setAnimationSpeed] = useState(1);
    const [frame, setFrame] = useState(0);
    const [baseType, setBaseType] = useState(BaseType.Shadow);
    const [textureType, setTextureType] = useState(TextureType.Icon);
    const [meshType, setMeshType] = useState(MeshType.Mesh);
    const [backgroundType, setBackgroundType] = useState(BackgroundType.Icon);
    const [backgroundColor, setBackgroundColor] = useState('#080808');

    // Derived state
    const iconHasBackgroundColorData = iconsys !== undefined && iconsys.bgColBL !== undefined;

    // Callback for renderer to report info back
    const iconInfoCallback = useCallback((newFrameCount: number, newTextureName: string | undefined, animationVersion: AnimationVersion, newVertexCount: number, newTriangleCount: number) => {
        setFrameCount(newFrameCount);
        setTextureName(newTextureName);
        setAnimationVersion(animationVersion);
        setVertexCount(newVertexCount);
        setTriangleCount(newTriangleCount);
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

    // Effect: Initialize loader and load default state
    useEffect(() => {
        const cancelRef = { cancelled: false };
        setLoadError(undefined);
        // Clear stale assets immediately to prevent old model from being displayed
        setResolvedAssets(undefined);

        (async () => {
            try {
                if (cancelRef.cancelled) return;

                // Get metadata from the loader
                const iconSysData = loader.getIconSys();
                const stateList = loader.getStates();
                const defaultState = loader.getDefaultState();

                setIconSys(iconSysData);
                setStates(stateList);
                setSelectedState(defaultState);
                setBackgroundType(iconSysData.bgColBL ? BackgroundType.Icon : BackgroundType.Color);

                // Load the default state - reset camera on initial load
                shouldResetCameraRef.current = true;
                const assets = await loader.loadState(defaultState);
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

    // Effect: Handle state changes (after initial load)
    useEffect(() => {
        if (!selectedState || !resolvedAssets) return;

        // Skip if this is the current state (already loaded)
        const currentState = resolvedAssets.currentState;
        if (selectedState.displayLabel === currentState.displayLabel && selectedState.filename === currentState.filename) return;

        const cancelRef = { cancelled: false };

        (async () => {
            try {
                const assets = await loader.loadState(selectedState);
                if (cancelRef.cancelled) return;

                // Don't reset camera when switching states
                shouldResetCameraRef.current = false;
                setResolvedAssets(assets);
            } catch (e) {
                if (cancelRef.cancelled) return;
                console.error('Error switching state:', e);
            }
        })();

        return () => {
            cancelRef.cancelled = true;
        };
    }, [loader, selectedState, resolvedAssets]);

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
        renderer.prop_baseType = baseType;
        renderer.prop_meshType = meshType;
    }, [doAnimation, animationSpeed, frame, baseType, meshType]);

    // Background color computation
    const color = calculateColor();

    function calculateColor() {
        if (backgroundType === BackgroundType.Icon && iconsys?.bgColTL) {
            const tl = iconsys.bgColTL;
            const tr = iconsys.bgColTR!;
            const bl = iconsys.bgColBL!;
            const br = iconsys.bgColBR!;
            const middle = Utils.averageColor([tl, tr, bl, br]);
            return `linear-gradient(to top left, ${br}, transparent, ${tl}), linear-gradient(to top right, ${bl}, transparent, ${tr}) ${middle}`;
        }
        return `linear-gradient(to top left, ${backgroundColor}, ${backgroundColor})`;
    }
    
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
                    {states.length > 1 && (
                        <>
                            <ul>
                                <li>
                                    <label>State
                                        <select
                                            value={selectedState ? states.findIndex(s => s.displayLabel === selectedState.displayLabel) : 0}
                                            onChange={e => setSelectedState(states[parseInt(e.target.value)])}
                                            title={selectedState ? `${selectedState.displayLabel} (${selectedState.filename})` : undefined}
                                        >
                                            {states.map((state, idx) => (
                                                <option
                                                    value={idx}
                                                    key={state.displayLabel}
                                                    label={state.displayLabel}
                                                >
                                                    {state.displayLabel} ({state.filename})
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </li>
                            </ul>
                            <hr/>
                        </>
                    )}
                    <ul>
                        {frameCount > 0 && (
                            <li>
                                <label>
                                    <span
                                        className={
                                            isStaticAnimation ? 'animation-static-label' :
                                            animationOutdated ? 'animation-warning-label' :
                                            undefined
                                        }
                                        title={
                                            isStaticAnimation ? 'Click for info about this static animation' :
                                            animationOutdated ? 'Click for info about animation playback' :
                                            undefined
                                        }
                                        onClick={!(animationOutdated || isStaticAnimation)
                                            ? undefined
                                            : (e) => {
                                                e.preventDefault();
                                                setShowAnimationModal(true);
                                            }
                                        }
                                    >
                                        Animate
                                    </span>
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
                            <label>Base
                                <select value={baseType} onChange={e => setBaseType(e.target.value as BaseType)}>
                                    {Object.values(BaseType).map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
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
                            <li className="action-buttons">
                                <button
                                    className="action-btn"
                                    onClick={() => setShowDetailsModal(true)}
                                    title="View icon metadata details"
                                >
                                    <IconInfoCircle size={16} />
                                    Details
                                </button>
                                <button
                                    className="action-btn"
                                    onClick={onDownload}
                                    disabled={!!downloadStatus}
                                    title="Download icon assets as a zip file"
                                >
                                    <IconDownload size={16} />
                                    {downloadStatus ?? 'Download'}
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
                        style={{transform: `scale(${imageFlip ? -1 : 1}, 1) rotate(${imageRotationDegrees}deg)`}}
                    />
                </div>
            )}

            {/* Enlarged texture modal - uses bare mode for custom layout */}
            <Modal
                isOpen={enlargeTextureView && !!resolvedAssets}
                onClose={() => setEnlargeTextureView(false)}
                portalContainer={portalTarget}
                bare={true}
                overlayClassName={`enlarged-texture-view ${fullscreen ? 'enlarged-texture-fullscreen' : ''}`}
                closeOnOverlayClick={false}
            >
                <div className="enlarged-texture-content" onClick={e => maybeCloseTextureView(e)}>
                    <div className="enlarged-texture-image-container">
                        <img
                            src={resolvedAssets?.textureBlobUrl}
                            alt="Icon texture"
                            style={{transform: `scale(${imageFlip ? -1 : 1}, 1) rotate(${imageRotationDegrees}deg)`}}
                        />
                    </div>
                    <div
                        className="enlarged-texture-toolbar"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="texture-toolbar-main">
                            <button
                                className="texture-toolbar-btn"
                                title="Rotate image 90 degrees anti-clockwise"
                                onClick={(e) => { e.stopPropagation(); setImageRotationDegrees(imageRotationDegrees - 90); }}
                            >
                                <IconRotate2 size={24} style={{transform: imageFlip ? 'scaleX(-1)' : undefined}} />
                            </button>
                            <button
                                className="texture-toolbar-btn"
                                title="Mirror image vertically"
                                onClick={(e) => { e.stopPropagation(); setImageFlip(!imageFlip); }}
                            >
                                <IconFlipVertical size={24} />
                            </button>
                            <button
                                className="texture-toolbar-btn"
                                title="Rotate image 90 degrees clockwise"
                                onClick={(e) => { e.stopPropagation(); setImageRotationDegrees(imageRotationDegrees + 90); }}
                            >
                                <IconRotate2 size={24} style={{transform: imageFlip ? undefined : 'scaleX(-1)'}} />
                            </button>
                        </div>
                        <button
                            className="texture-toolbar-btn texture-toolbar-close"
                            title="Close"
                            onClick={(e) => { e.stopPropagation(); setEnlargeTextureView(false); }}
                        >
                            <IconX size={24} />
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Animation version playback information modal */}
            <Modal
                isOpen={showAnimationModal}
                title={isStaticAnimation ? "Static Animation" : "Animation Playback Notice"}
                onClose={() => setShowAnimationModal(false)}
                portalContainer={portalTarget}
            >
                {isStaticAnimation ? (
                    <>
                        <p>
                            This icon has animation data, but the animation is static.
                        </p>
                        <br/>
                        <p>
                            All frames in this icon's animation contain identical vertex data, meaning the model
                            does not actually show any movement. The database tracks this & this icon will be categorised
                            as "Static" in the browse interface. Animation controls are still displayed for parity's sake.
                        </p>
                    </>
                ) : (
                    <>
                        <p>
                            Animation playback for this icon is inaccurate.
                        </p>
                        <br/>
                        <p>
                            This icon's animation was contributed with an earlier version of the extraction tool
                            that did not correctly capture all animation properties. To achieve accurate playback the icon assets
                            need to be re-extracted & re-contributed using the latest version of the <Link to="/extractor">PS2IODB Extractor</Link>.
                        </p>
                        <br/>
                        <p>
                            To see all icons needing re-contribution go <Link to={brokenAnimationsPath}>here</Link>.
                        </p>
                    </>
                )}
            </Modal>

            {/* Icon details modal */}
            <Modal
                isOpen={showDetailsModal}
                title="Icon Details"
                onClose={() => setShowDetailsModal(false)}
                portalContainer={portalTarget}
                className="icon-details-modal"
            >
                <table className="icon-details-table">
                    <tbody>
                        {[
                            { label: 'Directory', value: iconsys?.directory },
                            { label: 'Title', value: iconsys?.title },
                            { label: 'Idle Icon', value: iconsys?.normal },
                            { label: 'Copy Icon', value: iconsys?.copy },
                            { label: 'Delete Icon', value: iconsys?.delete },
                            { label: 'BG Opacity', value: iconsys?.bgOpacity },
                            { label: 'BG Color Top-Left', value: iconsys?.bgColTL },
                            { label: 'BG Color Top-Right', value: iconsys?.bgColTR },
                            { label: 'BG Color Bottom-Left', value: iconsys?.bgColBL },
                            { label: 'BG Color Bottom-Right', value: iconsys?.bgColBR },
                            { label: 'Light 1 Direction', value: iconsys?.light1Dir?.join(', ') },
                            { label: 'Light 2 Direction', value: iconsys?.light2Dir?.join(', ') },
                            { label: 'Light 3 Direction', value: iconsys?.light3Dir?.join(', ') },
                            { label: 'Light 1 Color', value: iconsys?.light1Col?.join(', ') },
                            { label: 'Light 2 Color', value: iconsys?.light2Col?.join(', ') },
                            { label: 'Light 3 Color', value: iconsys?.light3Col?.join(', ') },
                            { label: 'Ambient Light Color', value: iconsys?.ambiLightCol?.join(', ') },
                            { label: 'Vertices', value: vertexCount > 0 ? vertexCount.toLocaleString() : undefined },
                            { label: 'Triangles', value: triangleCount > 0 ? triangleCount.toLocaleString() : undefined },
                        ].map((row, index) => (
                            <tr key={row.label} className={index % 2 === 0 ? 'even' : 'odd'}>
                                <td className="label">{row.label}</td>
                                <td className={row.value === undefined ? 'missing' : ''}>
                                    {row.value !== undefined ? String(row.value) : 'Missing'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Modal>
        </div>
    );
};