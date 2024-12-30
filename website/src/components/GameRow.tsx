import { useMemo } from "react";
import { Title } from "../model/Title";
import RowBase from "./RowBase";

interface GameRowProps {
    game: Title;
}

/** Use for a game with no contribution or a single icon. */
const GameRow = ({game}: GameRowProps) => {
    const contributed = useMemo(() => game.icons.some(i => i.code), [game]);
    const icon = useMemo(() => game.icons.length > 0 ? game.icons[0] : undefined, [game]);
    const tooltip = useMemo(
        () => contributed 
            ? `This title has 1 icon with ${icon!.variantCount} unique state${icon!.variantCount! > 1 ? 's' : ''}.`
            : "This title has not yet been contributed.",
        [contributed, game.icons]
    );
    
    return (
        <RowBase
            title={game.name}
            contributed={contributed}
            circle={icon?.variantCount}
            code={icon?.code}
            tooltip={tooltip}
        />
    )
};

export default GameRow;