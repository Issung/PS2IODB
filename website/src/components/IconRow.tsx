import { Icon } from "../model/Icon";
import RowBase from "./RowBase";

interface IconRowProps {
    icon: Icon;
}

/** Use for a sub-item in a game that has more than 1 icon. */
const IconRow = ({icon}: IconRowProps) => {
    const contributed = icon?.code !== undefined;
    const tooltip = contributed 
            ? `This icon has ${icon!.uniqueStatesCount} unique state${icon!.uniqueStatesCount! > 1 ? 's' : ''}.`
            : "This icon has not yet been contributed.";

    return (
        <RowBase
            title={icon.name}
            contributed={contributed}
            circle={icon.uniqueStatesCount}
            code={icon?.code}
            tooltip={tooltip}
        />
    )
};

export default IconRow;