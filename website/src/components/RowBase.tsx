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
    const circleClass = (typeof circle == 'number') ? ('icons' + circle) : circle;
    const circleText = typeof circle == 'number' ? circle.toString() :
        circle === Trait.MultiIcon ? '+' :
        circle === Trait.Homebrew ? 'H':
        /* Undefined: */ '?';
    const rowClass = contributed ? "contributed" : "unknown";
    const classes = `TitleList-Row ${rowClass}`;
    
    //console.log('RowBase');

    return code ?
        // We do not use the react-router `<Link>` component here because it adds *a lot* of overhead when rendering many.
        // We have a click listener in TitleTable to handle the routing using 1 single `useNavigate` hook.
        // This leads to a roughly 70% improvement in changing browse filters (~200ms down to ~50-75ms).
        <a href={`/icon/${code}`} className={classes} title={tooltip}>
            <div className={`circle ${circleClass}`}>{circleText}</div>
            <h6>{title}</h6>
        </a>
    :
        <span className={classes} title={tooltip}>
            <div className={`circle ${circleClass}`}>{circleText}</div>
            <h6>{title}</h6>
        </span>
};

export default RowBase;