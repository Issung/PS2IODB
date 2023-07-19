import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { IconSys } from "./IconSys";
import ModelView from './ModelView';
import './Icon.scss'

export enum TextureType {
    Icon = 'Default',
    Test = 'Test Map',
    Plain = 'Plain',
}

export enum MeshType {
    Faces = 'Faces',
    Wireframe = 'Wireframe',
    FaceAndWireframe = 'Faces And Wireframe',
}

/**
 * This component serves as a page, routed to by App.tsx.
 * It contains a ModelView, and controls to interact with it, such as:
 * - Animation select.
 * - Lighting select.
 * - Shading select (wireframe, textured, etc).
 * - Play/pause controls.
 */
const Icon: React.FC = () => {
    const [exists, setExists] = useState('...');
    const [body, setBody] = useState('');
    const [iconsys, setIconSys] = useState<IconSys | null>(null);

    // Get icon code from the url
    const { iconcode } = useParams();
    const [variant, setVariant] = useState<string>();
    
    const [doAnimation, setDoAnimation] = useState(true);
    const [grid, setGrid] = useState(true);
    const [textureType, setTextureType] = useState(TextureType.Icon);
    const [meshType, setMeshType] = useState(MeshType.Faces);
    
    useEffect(() => {
        async function fetchIconSys() {
            // The 'icons' folder goes inside the 'website/public' folder.
            var url = `/icons/${iconcode}/iconsys.json`;
            var response = await fetch(url);
            var text = await response.text();

            if (text.startsWith('{')) {
                // The silly React server will return the index page on unknown paths and be a 200 so verify that the text starts as expected JSON.
                setExists('exists!')
                setBody(text);

                let tmpiconsys = JSON.parse(text) as IconSys;
                setIconSys(tmpiconsys);
                setVariant(tmpiconsys.normal);
            }
            else {
                setExists('does not exist.')
            }
        }

        fetchIconSys();
    }, [iconcode]);


    return(
        <div>
            <code>'{iconcode}' {exists}</code>
            <br/>
            <code>{body}</code>
            <br/><br/>
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
                        </ul>
                    </div>
                )
            }
            <br/>
            <ModelView iconcode={iconcode} variant={variant} animate={doAnimation} grid={grid} textureType={textureType}/>
        </div>
    );
};

export default Icon;