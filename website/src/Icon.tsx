import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { IconSys } from "./IconSys";
import ModelView from './ModelView';
import './Icon.scss'
import { MeshType, TextureType } from "./ModelViewParams";
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
    //const [exists, setExists] = useState('...');
    //const [body, setBody] = useState('');
    const [iconsys, setIconSys] = useState<IconSys | null>(null);

    // Get icon code from the url
    const { iconcode } = useParams();
    const [variant, setVariant] = useState<string>();
    
    const [doAnimation, setDoAnimation] = useState(true);
    const [grid, setGrid] = useState(true);
    const [textureType, setTextureType] = useState(TextureType.Icon);
    const [meshType, setMeshType] = useState(MeshType.Mesh);
    const [backgroundColor, setBackgroundColor] = useState('#020202');
    
    useEffect(() => {
        async function fetchIconSys() {
            // The 'icons' folder goes inside the 'website/public' folder.
            var url = `/icons/${iconcode}/iconsys.json`;
            var response = await fetch(url);
            var text = await response.text();

            if (text.startsWith('{'))
            {
                // The silly React server will return the index page on unknown paths and be a 200 so verify that the text starts as expected JSON.
                //setExists('exists!')
                //setBody(text);

                let tmpiconsys = JSON.parse(text) as IconSys;
                setIconSys(tmpiconsys);
                setVariant(tmpiconsys.normal);
            }
            else
            {
                //setExists('does not exist.')
            }
        }

        fetchIconSys();
    }, [iconcode]);

    async function download() {
        if (!iconsys) {
            return;
        }

        let variants = new Set([iconsys.normal, iconsys.copy, iconsys.delete]);
        let files: string[] = [];

        variants.forEach(variant => {
            files.push(`${variant}.anim`);
            files.push(`${variant}.mtl`);
            files.push(`${variant}.obj`);
            files.push(`${variant}.png`);
        });

        files.push('iconsys.json');

        const promises = files.map(async (file) => {
            var response = await fetch(`/icons/${iconcode}/${file}`);
            if (response.ok) {
                // TODO: Downloading the PNGs as text isn't going to work.
                var text = await response.text();

                // TODO: How do we check for this issue in the PNG cases? Check response mimetype?
                // Silly react server will return index page on 404s.
                if (!text.startsWith('<!DOCTYPE html>')) {
                    return {file, text}
                }
            }

            return null;
        });
        var results = await Promise.allSettled(promises);   // Await fetching of each file in parallel.

        const zip = new JSZip();

        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                zip.file(result.value.file, result.value.text);
            }
        });

        const zipContent = await zip.generateAsync({ type: 'blob' });

        // Create a download link for the zip file.
        const url = URL.createObjectURL(zipContent);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${iconcode}.zip`;
        document.body.appendChild(a);
        a.click();

        // Clean up the created URL.
        URL.revokeObjectURL(url);
    }

    return (
        <div>
            {/* <code>'{iconcode}' {exists}</code>
            <br/>
            <code>{body}</code>
            <br/><br/> */}
            {
                iconsys != null && (
                    <div id="iconoptions">
                        <ul>
                            <li>
                                <label>Animate Model: </label>
                                <input type="checkbox" checked={doAnimation} onChange={e => setDoAnimation(e.target.checked)}/>
                            </li>
                            <li>
                                <label>Display Grid: </label>
                                <input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)}/>
                            </li>
                            <li>
                                <label>Icon Variant: </label>
                                <select value={variant} onChange={e => setVariant(e.target.value)}>
                                    {/* Make a Set to remove duplicates, then turn back to Array to use .map(). */}
                                    {Array.from(new Set([iconsys.normal, iconsys.copy, iconsys.delete])).map(val => (
                                        <option value={val} key={val}>
                                            {val}
                                        </option>
                                    ))}
                                </select>
                            </li>
                            <li>
                                <label>Material: </label>
                                <select value={textureType} onChange={e => setTextureType(e.target.value as TextureType)}>
                                    {Object.values(TextureType).map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </li>
                            <li>
                                <label>Mesh: </label>
                                <select value={meshType} onChange={e => setMeshType(e.target.value as MeshType)}>
                                    {Object.values(MeshType).map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </li>
                            <li>
                                <label>Background Color: </label>
                                <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} />
                            </li>
                            <li>
                                <button onClick={download}>Download</button>
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