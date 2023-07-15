import { useEffect } from "react";
import ModelRendererImpl from "./ModelRendererImpl";

const ModelView: React.FC = () => {
    let renderer: ModelRendererImpl | null;

    useEffect(() => {
        renderer ??= new ModelRendererImpl();
    }, []);

    return(
        <canvas id="iconRenderCanvas" width={640} height={480}/>
    )
};

export default ModelView;