import { useEffect } from "react";
import ModelRendererImpl from "./ModelRendererImpl";

interface ModelViewProps {
    iconcode: string | undefined;
    variant: string | undefined;
    animate: boolean;
}

// Have to put this outside of the actual component because otherwise it gets re-constructed
// constantly??
const renderer = new ModelRendererImpl();

const ModelView: React.FC<ModelViewProps> = ({ iconcode, variant, animate }) => {
    useEffect(() => {
        renderer.init();
        return renderer.dispose;
    }, []);

    useEffect(() => {
        if (iconcode && variant) {
            renderer.loadNewIcon(iconcode, variant);
        }
    }, [iconcode, variant])

    useEffect(() => {
        if (renderer) {
            renderer.prop_animate = animate;
        }
    }, [animate])

    return(
        <canvas id="iconRenderCanvas" width={640} height={480}/>
    )
};

export default ModelView;