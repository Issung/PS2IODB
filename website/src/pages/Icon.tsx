import JSZip from "jszip";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon as IconModel } from "../model/Icon";
import { IconSys } from "../model/IconSys";
import { Titles } from "../model/Titles";
import { SessionStorageKeys } from '../utils/Consts';
import './Icon.scss';
import { ModelView, UrlModelLoader } from "../components/ModelView";

/**
 * This component serves as a page, routed to by App.tsx.
 * It contains a ModelView component that manages its own controls.
 * This page handles:
 * - Navigation (back button, keyboard shortcuts)
 * - Title and contributor display
 * - Download functionality
 * - Texture preview modal
 */
const Icon = () => {
    const navigate = useNavigate();
    const { iconcode } = useParams();

    const [icon, setIcon] = useState<IconModel | undefined>();
    const title = useMemo(() => {
        if (icon) {
            return icon.title!.name == icon.name ? icon.name : `${icon.title!.name} (${icon.name})`
        }
        return '';
    }, [icon]);

    // Texture preview state
    const [textureName, setTextureName] = useState<string>();
    const [enlargeTextureView, setEnlargeTextureView] = useState(false);
    const [imageRotationDegrees, setImageRotationDegrees] = useState(0);
    const [imageFlip, setImageFlip] = useState(false);

    // Download state
    const [downloadStatus, setDownloadStatus] = useState<string>();

    // Load icon metadata from Titles
    useEffect(() => {
        const foundIcon = Titles.flatMap(g => g.icons).find(i => i.code == iconcode);
        setIcon(foundIcon);
    }, [iconcode]);

    // Update document title
    useEffect(() => {
        if (icon) {
            document.title = title;
        }
    }, [icon, title]);

    // Keyboard navigation
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [enlargeTextureView]);

    function back() {
        if (sessionStorage.getItem(SessionStorageKeys.HasViewedHomePage) === "true") {
            navigate(-1);
        } else {
            navigate('/');
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape' || event.key == 'Backspace') {
            if (enlargeTextureView) {
                setEnlargeTextureView(false);
            } else {
                back();
            }
        }
    }

    // Callback from ModelView when texture is loaded
    const handleTextureInfo = useCallback((newTextureName: string | undefined) => {
        setTextureName(newTextureName);
    }, []);

    // Download functionality
    async function download() {
        setDownloadStatus('Loading...');
        try {
            await downloadImpl();
            setDownloadStatus(undefined);
        } catch (e) {
            console.error(e);
            setDownloadStatus('Error. Check console.');
        }
    }

    async function downloadImpl() {
        // Fetch iconsys first to get variant names
        const iconsysResponse = await fetch(`/icons/${iconcode}/iconsys.json`);
        const iconsysText = await iconsysResponse.text();
        if (!iconsysText.startsWith('{')) {
            throw new Error('Failed to fetch iconsys.json');
        }
        const iconsys = JSON.parse(iconsysText) as IconSys;

        // Get all unique variants
        const variants = new Set([iconsys.normal, iconsys.copy, iconsys.delete]);
        const files: string[] = [];

        // Assets required for each variant
        variants.forEach(variant => {
            files.push(`${variant}.anim`);
            files.push(`${variant}.mtl`);
            files.push(`${variant}.obj`);
            files.push(`${variant}.png`);
        });
        files.push('iconsys.json');

        // Fetch all files in parallel
        const promises = files.map(async (file) => {
            const response = await fetch(`/icons/${iconcode}/${file}`);
            if (response.ok) {
                if (file.endsWith('.png') && response.headers.get('content-type') === 'image/png') {
                    const png = await response.blob();
                    return { file, content: png };
                } else {
                    const text = await response.text();
                    if (!text.startsWith('<!DOCTYPE html>')) {
                        return { file, content: text };
                    }
                }
                if (file.endsWith('.anim')) {
                    console.warn(`Error loading ${file}, it may not have an animation.`);
                } else {
                    console.error(`Error loading ${file}.`);
                }
            }
            return null;
        });
        const results = await Promise.allSettled(promises);

        // Create zip file
        const zip = new JSZip();
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                zip.file(result.value.file, result.value.content);
            }
        });
        const zipContent = await zip.generateAsync({ type: 'blob' });

        // Trigger download
        const url = URL.createObjectURL(zipContent);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ps2iodb_${iconcode}.zip`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
    }

    /** Close texture view if clicking outside the image/buttons */
    function maybeCloseTextureView(event: React.MouseEvent<HTMLElement, MouseEvent>) {
        const targetNode = event.target as HTMLElement;
        const allowedTypes = ['BUTTON', 'IMG'];
        if (allowedTypes.indexOf(targetNode.nodeName) === -1) {
            setEnlargeTextureView(false);
        }
    }

    // Create loader for ModelView
    const loader = useMemo(() => {
        if (!iconcode) return undefined;
        return new UrlModelLoader(iconcode);
    }, [iconcode]);

    return (
        <div id="icon">
            {/* Back link */}
            <a id="back" href="/" onClick={(e) => { e.preventDefault(); back(); }}>← Home</a>

            {/* Game title and contributor */}
            <div id="title">
                {icon ? (
                    <>
                        <h5>{title}</h5>
                        <h6>Contributed by {icon.contributor?.link ?
                            <Link to={`/browse/contributor/${icon.contributor.name}#browse`} title={`View all contributions from ${icon.contributor.name}`}>{icon.contributor!.name}</Link>
                        :
                            `${icon.contributor?.name}`
                        }</h6>
                    </>
                ) : (
                    "Game not found."
                )}
            </div>

            {loader && (
                <ModelView
                    loader={loader}
                    onTextureInfo={handleTextureInfo}
                    onDownload={download}
                    downloadStatus={downloadStatus}
                />
            )}

            {/* Texture preview thumbnail */}
            {textureName && (
                <div id="texture-details">
                    <img
                        onClick={() => setEnlargeTextureView(true)}
                        src={`/icons/${iconcode}/${textureName}.png`}
                        title={`Icon texture image.`}
                        style={{transform: `rotate(${imageRotationDegrees}deg)`}}
                    />
                </div>
            )}

            {/* Enlarged texture modal */}
            {enlargeTextureView && (
                <div id="enlarged-texture-view" className="container-fluid">
                    <div className="row">
                        <div className="d-flex flex-column justify-content-center align-items-center" onClick={e => maybeCloseTextureView(e)}>
                            <a title={`Icon texture image.`}>
                                <img
                                    src={`/icons/${iconcode}/${textureName}.png`}
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

export default Icon;