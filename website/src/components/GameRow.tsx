import { useMemo } from "react";
import { Game } from "../model/Game";
import { Link } from "react-router-dom";

interface GameRowProps {
    game: Game;
}

const GameRow = (props: GameRowProps) => {
    const contributed = useMemo(() => props.game.code !== undefined, [props.game.code]);
    const rowClass = useMemo(() => contributed ? "contributed" : "unknown", [contributed]);
    const tooltip = useMemo(
        () => contributed 
            ? `This title has ${props.game.icons} unique icon${props.game.icons! > 1 ? 's' : ''}.`
            : "This title has not yet been contributed.",
        [contributed, props.game.icons]
    );
    
    return (
        <tr className={`GameRow ${rowClass}`}
            title={tooltip}
        >
            {contributed ?
                <>
                    <td>
                        <Link to={`/icon/${props.game.code}`}>
                            <div className={`circle n${props.game.icons}`} style={{}}>{props.game.icons}</div>
                        </Link> 
                    </td>
                    <td>
                        <Link to={`/icon/${props.game.code}`}>
                            <h6>{props.game.name}</h6>
                        </Link> 
                    </td>
                </>
            :
                <>
                    <td>
                        <div className="circle">?</div>
                    </td>
                    <td>
                        <h6>{props.game.name}</h6>
                    </td>
                </>
            }
        </tr>
    )
};

export default GameRow;