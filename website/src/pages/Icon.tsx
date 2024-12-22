import './Icon.scss';
import { GameList } from "../model/GameList";
import { Icon as IconModel } from "../model/Icon";
import { IconSys } from "../model/IconSys";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MeshType, TextureType } from "../components/ModelViewParams";
import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import ModelView from '../components/ModelView';
import { SessionStorageKeys } from '../utils/Consts';

/**
 * This component serves as a page, routed to by App.tsx.
 * It contains a ModelView, and controls to interact with it, such as:
 * - Animation select.
 * - Lighting select.
 * - Shading select (wireframe, textured, etc).
 * - Play/pause controls.
 */
const Icon = () => {
    const navigate = useNavigate();
    const [iconError, setIconError] = useState<string | undefined>(undefined);
    const [iconsys, setIconSys] = useState<IconSys | undefined>(undefined);

    const { iconcode } = useParams();
    const [variant, setVariant] = useState<string>();
    
    const [icon, setIcon] = useState<IconModel | undefined>();
    const title = useMemo(() => {
        if (icon) {
            return icon.game!.name == icon.name ? icon.name : `${icon.game!.name} (${icon.name})`
        }
        
        return '';
    }, [icon]);

    /**
     * Information obtained from renderer callback, how many frames does the current animation have. 0 if no animation.
     */
    const [frameCount, setFrameCount] = useState(0);
    const [textureName, setTextureName] = useState<string>();
    const [enlargeTextureView, setEnlargeTextureView] = useState(false);
    const [imageRotationDegrees, setImageRotationDegrees] = useState(0);
    const [imageFlip, setImageFlip] = useState(false);

    const [animationSpeed, setAnimationSpeed] = useState(1);
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
        let icon = GameList.flatMap(g => g.icons).find(i => i.code == iconcode);
        setIcon(icon);

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

    useEffect(() => {
        if (icon) {
            // Change the tab title to the displayed title.
            // When navigating back the title element on index.html will reset the tab title back.
            document.title = title;
        }
    }, [icon]);

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

    function back() {
        if (sessionStorage.getItem(SessionStorageKeys.HasViewedHomePage) === "true") {
            navigate(-1);
        }
        else {
            navigate('/');
        }
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

    /** Close the texture view if the click event is not on a button or the image. */
    function maybeCloseTextureView(event: React.MouseEvent<HTMLElement, MouseEvent>) {
        const targetNode = event.target as HTMLElement;
        const targetType = targetNode.nodeName;
        const allowedTypes = ['BUTTON', 'IMG'];
        if (allowedTypes.indexOf(targetType) === -1) {
            setEnlargeTextureView(false);
        }
    }

    return (
        <div id="icon">
            {/* Back link */}
            <a id="back" href="/" onClick={(e) => { e.preventDefault(); back(); }}>← Home</a>

            {/* Game title and contributor */}
            <h5 id="title">
                {icon ?
                    <>
                        {title}
                        <br/>
                        <h6>Contributed by {icon.contributor?.link ? 
                            <Link to={icon.contributor.link} target="_blank">{icon.contributor!.name}</Link>
                        :
                            `${icon.contributor?.name}`
                        }</h6>
                    </>
                :
                    "Game not found."
                }
            </h5>

            <ModelView 
                iconcode={iconcode} 
                variant={variant} 
                animate={doAnimation}
                animationSpeed={animationSpeed}
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
                            {frameCount > 0 && doAnimation &&
                                <li>
                                    <label>
                                        <span onClick={() => setAnimationSpeed(1)} title="Animation playback speed multiplier. Click label to reset to 1x.">
                                            Speed
                                        </span>
                                        <output style={{marginLeft: '5px', minWidth: 50}}>({animationSpeed}x)</output>
                                        <input type="range" min="0.01" max="5" step="0.01" value={animationSpeed} onChange={e => setAnimationSpeed(parseFloat(e.target.value))}/>
                                    </label>
                                </li>
                            }
                            {frameCount > 0 && !doAnimation &&
                                <li>
                                    <label>Frame
                                        <output style={{marginLeft: '5px', minWidth: 25}}>{frame + 1}/{frameCount}</output>
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
                <div id="enlarged-texture-view" className="container-fluid">
                    <div className="row">
                        <div className="d-flex flex-column justify-content-center align-items-center" onClick={e => maybeCloseTextureView(e)}>
                            <a title={`Icon texture image for '${variant}'.`}>
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
                                onClick={e => setImageRotationDegrees(imageRotationDegrees - 90)}
                            >
                                {imageFlip ? '↻' : '↺'}
                            </button>
                        </div>
                        <div className="col-4 col-md-3 col-xl-2 col-xxl-1">
                            <button
                                className="mx-auto d-block" title="Mirror image vertically" onClick={e => setImageFlip(!imageFlip)}>Mirror</button>
                        </div>
                        <div className="col-4 col-md-3 col-xl-2 col-xxl-1">
                            <button
                                className="mx-auto d-block" 
                                title="Rotate image 90 degrees clockwise" 
                                onClick={e => setImageRotationDegrees(imageRotationDegrees + 90)}
                            >
                                {imageFlip ? '↺' : '↻'}
                            </button>
                        </div>
                    </div>
                </div>
            }
        </div>
    );
};

export default Icon;