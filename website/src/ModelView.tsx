import { useEffect } from "react";
import './ModelView.scss';
import ModelRendererImpl from "./ModelRendererImpl";
import { MeshType, TextureType } from "./ModelViewParams";

interface ModelViewProps {
    iconcode: string | undefined;
    variant: string | undefined;
    textureType: TextureType;

    animate: boolean;
    grid: boolean;
    meshType: MeshType;
    backgroundColor: string;
}

const renderer = new ModelRendererImpl();

const ModelView: React.FC<ModelViewProps> = ({ iconcode, variant, textureType, animate, grid, meshType, backgroundColor }) => {
    useEffect(() => {
        renderer.init();
        return renderer.dispose;
    }, []);

    // Effect for iconcode or variant changing, requires loading of new assets.
    useEffect(() => {
        if (iconcode && variant) {
            renderer.loadNewIcon(iconcode, variant, textureType);
        }
    }, [iconcode, variant, textureType])

    // Effect for view options, does not require loading new assets.
    useEffect(() => {
        if (renderer) {
            renderer.prop_animate = animate;
            renderer.prop_grid = grid;
            renderer.prop_meshType = meshType;
            renderer.prop_backgroundColor = backgroundColor;
        }
    }, [animate, grid, meshType, backgroundColor])

    return(
        <canvas id="iconRenderCanvas" />
    )
};

export default ModelView;