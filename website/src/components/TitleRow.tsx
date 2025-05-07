import { useMemo } from "react";
import { Title } from "../model/Title";
import RowBase from "./RowBase";

interface TitleRowProps {
    game: Title;
}

/** Use for a game with no contribution or a single icon. */
const TitleRow = ({game: title}: TitleRowProps) => {
    const contributed = useMemo(() => title.icons.some(i => i.code), [title]);
    const icon = useMemo(() => title.icons.length > 0 ? title.icons[0] : undefined, [title]);
    const tooltip = useMemo(
        () => contributed 
            ? `This title has 1 icon with ${icon!.variantCount} unique state${icon!.variantCount! > 1 ? 's' : ''}.`
            : "This title has not yet been contributed.",
        [contributed, title.icons]
    );
    
    return (
        <RowBase
            title={title.name}
            contributed={contributed}
            circle={icon?.variantCount}
            code={icon?.code}
            tooltip={tooltip}
        />
    )
};

export default TitleRow;