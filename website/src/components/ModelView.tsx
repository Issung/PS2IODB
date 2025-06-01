import { useEffect, useMemo } from "react";
import { IconSys } from '../model/IconSys';
import { IconInfoCallback, ModelRendererImpl } from "./ModelRendererImpl";
import './ModelView.scss';
import { BackgroundType, MeshType, TextureType } from "./ModelViewParams";
import { Utils } from "../utils/Utils";
import { icons } from "@tabler/icons-react";

export interface ModelViewProps {
    // Properties that require network requests.
    iconcode: string | undefined;
    iconsys: IconSys | undefined;
    variant: string | undefined;
    textureType: TextureType;

    // Properties that don't require any networking.
    animate: boolean;
    animationSpeed: number;
    frame: number;
    grid: boolean;
    meshType: MeshType;
    backgroundType: BackgroundType;
    backgroundColor: string;

    /** Callback for the impl to give information back to the Icon UI. */
    callback: IconInfoCallback;
}

const renderer = new ModelRendererImpl();

export const ModelView = ({
    iconcode, iconsys, variant, textureType, animate, animationSpeed,
    frame, grid, meshType, backgroundType, backgroundColor, callback
} : ModelViewProps) => {
    useEffect(() => {
        renderer.initialise();
        return renderer.dispose;
    }, []);

    useEffect(() => {
        if (iconcode && iconsys) {
            renderer.loadNewIcon(iconcode, iconsys);
        }
    }, [iconsys])

    // Effect for iconcode or variant changing, requires loading of new assets.
    useEffect(() => {
        renderer.prop_callback = callback;
        if (iconcode && variant) {
            renderer.loadVariant(variant, textureType);
        }
    }, [iconcode, variant, textureType, callback])

    // Effect for view options, does not require loading new assets.
    useEffect(() => {
        if (renderer) {
            renderer.prop_animate = animate;
            renderer.prop_animationSpeed = animationSpeed;
            renderer.prop_frame = frame;
            renderer.prop_grid = grid;
            renderer.prop_meshType = meshType;
        }
    }, [animate, animationSpeed, frame, grid, meshType, backgroundColor])

    const color = useMemo(() => {
        if (backgroundType == BackgroundType.Icon && iconsys?.bgColTL) {
            const tl = iconsys.bgColTL;
            const tr = iconsys.bgColTR!;    // Exclamation marks on these, we know one is defined so we will assume all are defined.
            const bl = iconsys.bgColBL!;
            const br = iconsys.bgColBR!;
            const middle = Utils.averageColor([tl, tr, bl, br]);
            
            // 4-way gradient original source from here: https://stackoverflow.com/a/53602030/8306962.
            // Modifications made to calculate the middle color...
            return `linear-gradient(to top left, ${br}, transparent, ${tl}), linear-gradient(to top right, ${bl}, transparent, ${tr}) ${middle}`;
        }
        else {
            // If we just use a solid color the background doesn't actually redraw once the iconsys is reloaded, at least in chrome.. I think this is a browser bug
            // Because if you disable the background style and re-enable it it draws as intended. If we keep using a linear-gradient then it has no issue!
            // We don't continue to use the 4-point gradient because then when the user changes the color themselves the middle color lags behind, like it is the only one affected by the transition rule.
            return `linear-gradient(to top left, ${backgroundColor}, ${backgroundColor})`
        }
    }, [backgroundType, backgroundColor]);

    return(
        // TODO: The browser just isn't redrawing the background :(.
        <canvas
            id="iconRenderCanvas"
            style={{
                transition: 'background 2s',
                background: color
            }}
        />
    )
};