import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import JSZip from "jszip";
import './Icon.scss'
import { IconSys } from "../model/IconSys";
import ModelView from '../components/ModelView';
import { MeshType, TextureType } from "../components/ModelViewParams";
import { promiseHooks } from "v8";

/**
 * This component serves as a page, routed to by App.tsx.
 * It contains a ModelView, and controls to interact with it, such as:
 * - Animation select.
 * - Lighting select.
 * - Shading select (wireframe, textured, etc).
 * - Play/pause controls.
 */
const Icon: React.FC = () => {
    const navigate = useNavigate();
    const [iconError, setIconError] = useState<string | undefined>(undefined);
    const [iconsys, setIconSys] = useState<IconSys | undefined>(undefined);

    const { iconcode } = useParams();
    const [variant, setVariant] = useState<string>();
    
    /**
     * Information obtained from renderer callback, how many frames does the current animation have. 0 if no animation.
     */
    const [frameCount, setFrameCount] = useState(0);
    const [textureName, setTextureName] = useState<string>();
    const [enlargeTextureView, setEnlargeTextureView] = useState(false);
    const [imageRotationDegrees, setImageRotationDegrees] = useState(0);
    const [imageFlip, setImageFlip] = useState(false);

    const [doAnimation, setDoAnimation] = useState(true);
    const [frame, setFrame] = useState(0);
    const [grid, setGrid] = useState(true);
    const [textureType, setTextureType] = useState(TextureType.Icon);
    const [meshType, setMeshType] = useState(MeshType.Mesh);
    const [backgroundColor, setBackgroundColor] = useState('#080808');

    const [downloadStatus, setDownloadStatus] = useState<string>();
    
    useEffect(() => {
        // Add/remove event listener when component mounts/dismounts.
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [enlargeTextureView]);
    
    
    useEffect(() => {
        async function fetchIconSys() {
            try {

                // The 'icons' folder goes inside the 'website/public' folder.
                var url = `/icons/${iconcode}/iconsys.json`;
                var response = await fetch(url);
                var text = await response.text();
                
                if (text.startsWith('{'))
                {
                    let tmpiconsys = JSON.parse(text) as IconSys;
                    setIconSys(tmpiconsys);
                    setVariant(tmpiconsys.normal);
                }
                else
                {
                    throw new Error(`IconSys JSON response did not start with '{'. Body: ${text}.`)
                }
            }
            catch (e) {
                if (e instanceof Error) {
                    setIconError('Error loading icon data. ' + e.message);
                }
            }
        }

        fetchIconSys();
    }, [iconcode]);

    function iconInfoCallback(frameCount: number, textureName: string | undefined) {
        setFrameCount(frameCount);
        setTextureName(textureName);
    }

    async function download() {
        setDownloadStatus('Loading...');
        downloadImpl()
            .then(() => setDownloadStatus(undefined))
            .catch((e) => {
                console.error(e);
                setDownloadStatus('Error. Check console.');
            });
    }

    async function downloadImpl() {
        if (!iconsys) {
            return;
        }

        // Get all unique variants (duplicates discarded by set).
        let variants = new Set([iconsys.normal, iconsys.copy, iconsys.delete]);
        let files: string[] = [];

        // Assets required for each variant.
        variants.forEach(variant => {
            files.push(`${variant}.anim`);  // Optional, not all icons/variants have animations.
            files.push(`${variant}.mtl`);
            files.push(`${variant}.obj`);
            files.push(`${variant}.png`);
        });

        files.push('iconsys.json'); // iconsys.json is always needed.

        // Create a list of promises to load each asset, and await them in parallel with allSettled.
        const promises = files.map(async (file) => {
            var response = await fetch(`/icons/${iconcode}/${file}`);
            if (response.ok) {
                // For PNGs we need a blob, not text. Check content-type header in case react returned index page on 404.
                if (file.endsWith('.png') && response.headers.get('content-type') === 'image/png') {
                    var png = await response.blob();
                    return { file, content: png };
                }
                else {
                    var text = await response.text();
                    
                    // Silly server will return index page on a 404.
                    if (!text.startsWith('<!DOCTYPE html>')) {
                        return { file, content: text };
                    }
                }

                if (file.endsWith('.anim')) {
                    console.warn(`Error loading ${file}, it is an anim file so there is a chance the icon just doesn't have an animation.`);
                }
                else {
                    console.error(`Error loading ${file}.`);
                }
            }

            return null;
        });
        var results = await Promise.allSettled(promises);   // Await fetching of each file in parallel.

        // Create a zip file, load all successful files in and generate blob.
        const zip = new JSZip();
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                zip.file(result.value.file, result.value.content);
            }
        });
        const zipContent = await zip.generateAsync({ type: 'blob' });

        // Create URL for blob and create anchor element with the blob, then programmatically click element to begin download.
        const url = URL.createObjectURL(zipContent);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ps2iodb_${iconcode}.zip`;
        document.body.appendChild(a);
        a.click();

        // Clean up the created blob URL.
        URL.revokeObjectURL(url);
    }

    function rotateImage(event: React.MouseEvent<HTMLButtonElement, MouseEvent>, amount: number) {
        event.stopPropagation();
        setImageRotationDegrees(imageRotationDegrees + amount);
    }
    
    function back() {
        navigate(-1);
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape' || event.key == 'Backspace') {
            if (enlargeTextureView) {
                setEnlargeTextureView(false);
            }
            else {
                back();
            }
        }
    }

    return (
        <div id="icon">
            <a id="back" href="/" onClick={(e) => { e.preventDefault(); back(); }}>← Home</a>
            <ModelView 
                iconcode={iconcode} 
                variant={variant} 
                animate={doAnimation}
                frame={frame} 
                grid={grid} 
                textureType={textureType} 
                meshType={meshType} 
                backgroundColor={backgroundColor} 
                callback={iconInfoCallback}
                />
            {iconError && (<code>{iconError}</code>)}
            {
                iconsys != null && (
                    <div id="iconoptions">
                        <ul>
                            {frameCount > 0 && 
                                <li>
                                    <label>Animate
                                        <input type="checkbox" checked={doAnimation} onChange={e => setDoAnimation(e.target.checked)}/>
                                    </label>
                                </li>
                            }
                            {frameCount > 0 && !doAnimation &&
                                <li>
                                    <label>Frame
                                        <output style={{marginLeft: '5px'}}>{frame + 1}/{frameCount}</output>
                                        <input type="range" min={0} max={frameCount - 1} value={frame} onChange={e => setFrame(parseInt(e.target.value))}/>
                                    </label>
                                </li>
                            }
                            <li>
                                <label>Display Grid
                                    <input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)}/>
                                </label>
                            </li>
                            <li>
                                <label>Background Color
                                    <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} />
                                </label>
                            </li>
                            <li>
                                <label>Icon Variant
                                    <select value={variant} onChange={e => setVariant(e.target.value)}>
                                        {/* Make a Set to remove duplicates, then turn back to Array to use .map(). */}
                                        {Array.from(new Set([iconsys.normal, iconsys.copy, iconsys.delete])).map(val => (
                                            <option value={val} key={val}>
                                                {val}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </li>
                            <li>
                                <label>Material
                                    <select value={textureType} onChange={e => setTextureType(e.target.value as TextureType)}>
                                        {Object.values(TextureType).map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </li>
                            <li>
                                <label>Mesh
                                    <select value={meshType} onChange={e => setMeshType(e.target.value as MeshType)}>
                                        {Object.values(MeshType).map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </li>
                            <li>
                                <button onClick={download} disabled={downloadStatus ? true : false}>{downloadStatus ?? 'Download Icon Assets ⬇️'}</button>
                            </li>
                        </ul>
                    </div>
                )
            }
            {textureName && 
                <div id="texture-details">
                    <img 
                        onClick={() => setEnlargeTextureView(true)}
                        src={`/icons/${iconcode}/${textureName}.png`}
                        title={`Icon texture image for '${variant}'.`}
                        style={{transform: `rotate(${imageRotationDegrees}deg)`}}
                    />
                </div>
            }
            {enlargeTextureView && 
                <div id="enlarged-texture-view" className="container-fluid" onClick={() => setEnlargeTextureView(false)}>
                    <div className="row">
                        <div className="d-flex flex-column justify-content-center align-items-center">
                            <a title={`Icon texture image for '${variant}'.`} onClick={event => event.stopPropagation()}>
                                <img
                                    src={`/icons/${iconcode}/${textureName}.png`}
                                    style={{transform: `scale(${imageFlip ? -1 : 1}, 1) rotate(${imageRotationDegrees}deg)`}}
                                />
                            </a>
                        </div>
                    </div>
                    <div className="row justify-content-center align-items-center">
                        <div className="col-4 col-md-3 col-xl-2 col-xxl-1">
                            <button className="mx-auto d-block" title="Rotate image 90 degrees anti-clockwise" onClick={e => rotateImage(e, -90)}>↺</button>
                        </div>
                        <div className="col-4 col-md-3 col-xl-2 col-xxl-1">
                            <button
                                className="mx-auto d-block" title="Flip image right to left" onClick={e => {e.stopPropagation(); setImageFlip(!imageFlip); }}>Mirror</button>
                        </div>
                        <div className="col-4 col-md-3 col-xl-2 col-xxl-1">
                            <button
                                className="mx-auto d-block" title="Rotate image 90 degrees clockwise" onClick={e => rotateImage(e, +90)}>↻</button>
                        </div>
                    </div>
                </div>
            }
        </div>
    );
};

export default Icon;