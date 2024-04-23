import './ModelView.scss';
import { useEffect } from "react";
import { ModelRendererImpl, IconInfoCallback } from "./ModelRendererImpl";
import { MeshType, TextureType } from "./ModelViewParams";

interface ModelViewProps {
    // Properties that require network requests.
    iconcode: string | undefined;
    variant: string | undefined;
    textureType: TextureType;

    // Properties that don't require any networking.
    animate: boolean;
    frame: number;
    grid: boolean;
    meshType: MeshType;
    backgroundColor: string;

    /** Callback for the impl to give information back to the Icon UI. */
    callback: IconInfoCallback;
}

const renderer = new ModelRendererImpl();

const ModelView: React.FC<ModelViewProps> = ({ iconcode, variant, textureType, animate, frame, grid, meshType, backgroundColor, callback }) => {
    useEffect(() => {
        renderer.init();
        return renderer.dispose;
    }, []);

    // Effect for iconcode or variant changing, requires loading of new assets.
    useEffect(() => {
        renderer.prop_callback = callback;
        if (iconcode && variant) {
            renderer.loadNewIcon(iconcode, variant, textureType);
        }
    }, [iconcode, variant, textureType, callback])

    // Effect for view options, does not require loading new assets.
    useEffect(() => {
        if (renderer) {
            renderer.prop_animate = animate;
            renderer.prop_frame = frame;
            renderer.prop_grid = grid;
            renderer.prop_meshType = meshType;
            renderer.prop_backgroundColor = backgroundColor;
        }
    }, [animate, frame, grid, meshType, backgroundColor])

    return(
        <canvas id="iconRenderCanvas" />
    )
};

export default ModelView;