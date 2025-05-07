import { useMemo } from "react";
import { Link } from "react-router-dom";

export enum Trait {
    /** Use for games that have multiple icons. */
    MultiIcon = "multiIcon",
    /** 
     * Intended for use by homebrew games. 
     * This will have to be noted on the game records.
     * Will it be displayed as 2 circles for the number + 'H'? Interesting UI question there.
     */
    Homebrew = "homebrew",
}

interface RowBaseProps {
    title: string;

    /** Assumed `true` if `code` is set. */
    contributed?: boolean;

    /** Will cause this row to become a hyperlink. */
    code?: string;

    /** What to display in the row's circle */
    circle?: number | Trait;

    tooltip?: string;
}

const RowBase = ({title, contributed, code, circle, tooltip}: RowBaseProps) => {
    const circleClass = useMemo(() => (typeof circle == 'number') ? ('icons' + circle) : circle, [circle]);
    const circleText = useMemo(() => 
        typeof circle == 'number' ? circle.toString() :
        circle === Trait.MultiIcon ? '+' :
        circle === Trait.Homebrew ? 'H':
        /* Undefined: */ '?', 
        [circle]);
    const rowClass = useMemo(() => contributed ? "contributed" : "unknown", [contributed]);
    
    const classes = `TitleList-Row ${rowClass}`;
    
    return code ?
        <Link to={`/icon/${code}`} className={classes} title={tooltip}>
            <div className={`circle ${circleClass}`}>{circleText}</div>
            <h6>{title}</h6>
        </Link>
    :
        <span className={classes} title={tooltip}>
            <div className={`circle ${circleClass}`}>{circleText}</div>
            <h6>{title}</h6>
        </span>
};

export default RowBase;