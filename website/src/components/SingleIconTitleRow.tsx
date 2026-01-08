import { Title } from "../model/Title";
import RowBase from "./RowBase";

interface SingleIconTitleRowProps {
    title: Title;
}

/** Use for a game with no contribution or a single icon. */
const SingleIconTitleRow = ({title: title}: SingleIconTitleRowProps) => {
    const contributed = title.icons.some(i => i.code);
    const icon = title.icons.length > 0 ? title.icons[0] : undefined;
    const tooltip = contributed 
            ? `This title has 1 icon with ${icon!.uniqueStates} unique state${icon!.uniqueStates! > 1 ? 's' : ''}.`
            : "This title has not yet been contributed.";
    
    return (
        <RowBase
            title={title.name}
            contributed={contributed}
            circle={icon?.uniqueStates}
            code={icon?.code}
            tooltip={tooltip}
        />
    )
};

export default SingleIconTitleRow;