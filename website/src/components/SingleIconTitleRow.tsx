import { Title } from "../model/Title";
import RowBase, { Trait } from "./RowBase";

interface SingleIconTitleRowProps {
    title: Title;
}

/** Use for a game with no contribution or a single icon. */
const SingleIconTitleRow = ({title: title}: SingleIconTitleRowProps) => {
    const icons = title.icons;
    const contributed = icons?.some(i => i.code) ?? false;
    const noIcons = icons === null;
    const icon = icons && icons.length > 0 ? icons[0] : undefined;
    const tooltip =
        contributed ? `This title has 1 icon with ${icon!.uniqueStates} unique state${icon!.uniqueStates! > 1 ? 's' : ''}.` :
        noIcons ? "This title has been verified to have no icons." :
        "This title has not yet been contributed.";

    return (
        <RowBase
            title={title.name}
            contributed={contributed}
            circle={noIcons ? Trait.NoIcons : icon?.uniqueStates}
            code={icon?.code}
            tooltip={tooltip}
        />
    )
};

export default SingleIconTitleRow;