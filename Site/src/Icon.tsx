import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { init, animate, setAnimationState } from "./ModelView";
import { IconSys } from "./IconSys";

const Icon: React.FC = () => {
    // Get icon code from the url
    const { iconcode } = useParams();
    const [exists, setExists] = useState('...');
    const [body, setBody] = useState('');
    const [doAnimation, setAnimation] = useState(true);
    const [iconsys, setIconSys] = useState<IconSys | null>(null);
    const [variant, setVariant] = useState<string>();
    
    // Nasty side effect of React.StrictMode, useEffect runs twice. https://react.dev/learn/you-might-not-need-an-effect#initializing-the-application
    //let firstRun: boolean = true;
    
    // TODO: Because of useEffect running twice on init which is an unintended side effect, its possible we should instead be doing icon rendering in a separate component
    //       to this one, then the useState effect should only run once, then double initialising shouldn't be an issue.

    useEffect(() => {
        console.log(`useeffect, first run, continuing.`);

        // The 'icons' folder goes inside the 'Site/public' folder.
        var url = `/icons/${iconcode}/iconsys.json`;
        fetch(url)
            .then(response => {
                response
                    .text()
                    .then(text => {
                        if (text.startsWith('{')) {
                            // The silly React server will return the index on random paths and be a 200 so verify that the text doesn't start with the html prefix.
                            //setExists((response.status.toString()[0] == '2' && !text.startsWith('<!DOCTYPE html>')) ? 'exists!' : 'does not exist.');
                            setExists('exists!')
                            setBody(text);

                            let tmpiconsys = JSON.parse(text) as IconSys;
                            setIconSys(tmpiconsys);

                            // Initialise the threejs model viewer and start the animation (if there is any).
                            if (iconcode != null && tmpiconsys.normal != null) {
                                init(iconcode, tmpiconsys.normal);
                                animate();
                            }
                        }
                        else {
                            setExists('does not exist.')
                        }
                    });
            });
    }, [iconcode]);

    useEffect(() => {
        if (iconcode != null && iconsys != null && variant != null) {
            init(iconcode, variant);
            animate();
        }
    }, [iconcode, iconsys, variant]);

    return(
        <div>
            <p>'{iconcode}' {exists}</p>
            <br/>
            <p>{body}</p>
            {
                iconsys != null && (
                    <div id="iconoptions">
                        <label>Animate Model: </label>
                        <input type="checkbox" checked={doAnimation} onChange={e => {setAnimation(e.target.checked); setAnimationState(e.target.checked);}}/>
                        <br/>
                        <label>Icon Variant:</label>
                        <select value={variant} onChange={e => setVariant(e.target.value)}>
                            {[iconsys.normal, iconsys.copy, iconsys.delete].map(val => (
                                <option value={val} key={val}>
                                    {val}
                                </option>
                            ))}
                        </select>
                    </div>
                )
            }
            <br/>
            <canvas id="iconRenderCanvas" width={640} height={480}/>
        </div>
    );
};

export default Icon;