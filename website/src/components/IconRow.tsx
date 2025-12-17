import { useMemo } from "react";
import { Icon } from "../model/Icon";
import RowBase from "./RowBase";

interface IconRowProps {
    icon: Icon;
}

/** Use for a sub-item in a game that has more than 1 icon. */
const IconRow = ({icon}: IconRowProps) => {
    const contributed = useMemo(() => icon?.code !== undefined, [icon]);
    const tooltip = useMemo(
        () => contributed 
            ? `This icon has ${icon!.uniqueStates} unique state${icon!.uniqueStates! > 1 ? 's' : ''}.`
            : "This icon has not yet been contributed.",
        [icon]
    );

    return (
        <RowBase
            title={icon.name}
            contributed={contributed}
            circle={icon.uniqueStates}
            code={icon?.code}
            tooltip={tooltip}
        />
    )
};

export default IconRow;