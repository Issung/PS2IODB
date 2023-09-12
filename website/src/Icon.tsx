import { IconSys } from "./IconSys";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { MeshType, TextureType } from "./ModelViewParams";
import ModelView from './ModelView';
import './Icon.scss'
import JSZip from "jszip";

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
    
    const [doAnimation, setDoAnimation] = useState(true);
    const [grid, setGrid] = useState(true);
    const [textureType, setTextureType] = useState(TextureType.Icon);
    const [meshType, setMeshType] = useState(MeshType.Mesh);
    const [backgroundColor, setBackgroundColor] = useState('#020202');

    const [downloadStatus, setDownloadStatus] = useState('');
    
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

    async function download() {
        setDownloadStatus('Loading...');
        downloadImpl()
            .then(() => setDownloadStatus(''))
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
                    
                    // Silly react server will return index page on 404s.
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

    return (
        <div id="icon">
            <a id="back" href="/" onClick={(e) => { e.preventDefault(); navigate(-1); }}>← Back</a>
            {iconError && (<code>{iconError}</code>)}
            {
                iconsys != null && (
                    <div id="iconoptions">
                        <ul>
                            <li>
                                <label>Animate Model: 
                                    <input type="checkbox" checked={doAnimation} onChange={e => setDoAnimation(e.target.checked)}/>
                                </label>
                            </li>
                            <li>
                                <label>Display Grid: 
                                    <input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)}/>
                                </label>
                            </li>
                            <li>
                                <label>Background Color: 
                                    <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} />
                                </label>
                            </li>
                            <li>
                                <label>Icon Variant: 
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
                                <label>Material:
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
                                <label>Mesh: 
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
                                <button onClick={download} style={{marginRight: 5}}>Download ⬇️</button>
                                <label>{downloadStatus}</label>
                            </li>
                        </ul>
                    </div>
                )
            }
            <br/>
            <ModelView iconcode={iconcode} variant={variant} animate={doAnimation} grid={grid} textureType={textureType} meshType={meshType} backgroundColor={backgroundColor} />
        </div>
    );
};

export default Icon;