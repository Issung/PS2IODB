import { useEffect } from "react";
import { AllModelsRenderer } from "../components/AllModelsRenderer";

const renderer = new AllModelsRenderer();

const Everything: React.FC = () => {
    useEffect(() => {
        renderer.init();
        return renderer.dispose;
    }, []);

    return (
        <canvas id="all-models-canvas"/>
    );
};

export default Everything;
