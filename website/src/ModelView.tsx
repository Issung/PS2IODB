import { useEffect } from "react";
import './ModelView.scss';
import ModelRendererImpl from "./ModelRendererImpl";
import { MeshType, TextureType } from "./ModelViewParams";

interface ModelViewProps {
    iconcode: string | undefined;
    variant: string | undefined;

    animate: boolean;
    grid: boolean;
    textureType: TextureType;
    meshType: MeshType;
    backgroundColor: string;
}

const renderer = new ModelRendererImpl();

const ModelView: React.FC<ModelViewProps> = ({ iconcode, variant, textureType, animate, grid, meshType, backgroundColor }) => {
    //const renderer = useRef(new ModelRendererImpl());

    useEffect(() => {
        renderer/*.current*/.init();
        return renderer/*.current*/.dispose;
    }, []);

    // Effect for iconcode or variant changing, requires loading of new assets.
    useEffect(() => {
        if (iconcode && variant) {
            renderer/*.current*/.loadNewIcon(iconcode, variant, textureType);
        }
    }, [iconcode, variant, textureType])

    // Effect for view options, does not require loading new assets.
    useEffect(() => {
        if (renderer) {
            renderer/*.current*/.prop_animate = animate;
            renderer/*.current*/.prop_grid = grid;
            renderer/*.current*/.prop_meshType = meshType;
            renderer/*.current*/.prop_backgroundColor = backgroundColor;
        }
    }, [animate, grid, meshType, backgroundColor])

    return(
        <canvas id="iconRenderCanvas" />
    )
};

export default ModelView;