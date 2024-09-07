import { useMemo } from "react";
import { Game } from "../model/Game";
import RowBase from "./RowBase";

interface GameRowProps {
    game: Game;
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
            variantCount={icon?.variantCount ?? 0}
            code={icon?.code}
            tooltip={tooltip}
        />
    )
};

export default GameRow;