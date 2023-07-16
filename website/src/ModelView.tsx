import { useEffect, useRef } from "react";
import ModelRendererImpl from "./ModelRendererImpl";

interface ModelViewProps {
    iconcode: string | undefined;
    variant: string | undefined;
    animate: boolean;
}

const ModelView: React.FC<ModelViewProps> = ({ iconcode, variant, animate }) => {
    const renderer = useRef(new ModelRendererImpl());

    useEffect(() => {
        renderer.current.init();
        return renderer.current.dispose;
    }, []);

    // Effect for iconcode or variant changing, requires loading of new assets.
    useEffect(() => {
        if (iconcode && variant) {
            renderer.current.loadNewIcon(iconcode, variant);
        }
    }, [iconcode, variant])

    // Effect for view options, does not require loading new assets.
    useEffect(() => {
        if (renderer) {
            renderer.current.prop_animate = animate;
        }
    }, [animate])

    return(
        <canvas id="iconRenderCanvas" width={640} height={480}/>
    )
};

export default ModelView;