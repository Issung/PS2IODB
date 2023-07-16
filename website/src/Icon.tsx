import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { IconSys } from "./IconSys";
import ModelView from './ModelView';

/**
 * This component serves as a page, routed to by App.tsx.
 * It contains an IconRenderer, and controls to interact with such as:
 * - Animation select.
 * - Lighting select.
 * - Shading select (wireframe, textured, etc).
 * - Play/pause controls.
 */
const Icon: React.FC = () => {
    // Get icon code from the url
    const { iconcode } = useParams();
    const [exists, setExists] = useState('...');
    const [body, setBody] = useState('');
    const [doAnimation, setDoAnimation] = useState(true);
    const [iconsys, setIconSys] = useState<IconSys | null>(null);
    const [variant, setVariant] = useState<string>();
    
    // Nasty side effect of React.StrictMode, useEffect runs twice. https://react.dev/learn/you-might-not-need-an-effect#initializing-the-application
    //let firstRun: boolean = true;
    
    // TODO: Clean up, try to use async-await instead of fluent.
    useEffect(() => {
        async function fetchIconSys() {
            // The 'icons' folder goes inside the 'Site/public' folder.
            var url = `/icons/${iconcode}/iconsys.json`;
            var response = await fetch(url);
            var text = await response.text();

            if (text.startsWith('{')) {
                // The silly React server will return the index on random paths and be a 200 so verify that the text doesn't start with the html prefix.
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
            <p>'{iconcode}' {exists}</p>
            <br/>
            <p>{body}</p>
            {
                iconsys != null && (
                    <div id="iconoptions">
                        <label>Animate Model: </label>
                        <input type="checkbox" checked={doAnimation} onChange={e => setDoAnimation(e.target.checked)}/>
                        <br/>
                        <label>Icon Variant:</label>
                        <select value={variant} onChange={e => setVariant(e.target.value)}>
                            {/* Make a Set to remove duplicates, then turn back to Array to use .map(). */}
                            {Array.from(new Set([iconsys.normal, iconsys.copy, iconsys.delete])).map(val => (
                                <option value={val} key={val}>
                                    {val}
                                </option>
                            ))}
                        </select>
                    </div>
                )
            }
            <br/>
            <ModelView iconcode={iconcode} variant={variant} animate={doAnimation} />
        </div>
    );
};

export default Icon;