import { useMemo } from "react";
import { Link } from "react-router-dom";

interface RowBaseProps {
    title: string;

    /** Assumed `true` if `code` is set. */
    contributed?: boolean;

    /** Will cause this row to become a hyperlink. */
    code?: string;

    /** 0 = no variants. */
    variantCount: number;
    
    tooltip?: string;
}

const RowBase = ({title, contributed, code, variantCount, tooltip}: RowBaseProps) => {
    const rowClass = useMemo(() => contributed ? "contributed" : "unknown", [contributed]);
    
    return (
        <tr className={`GameRow ${rowClass}`}
            title={tooltip}
        >
            {code ?
                <>
                    <td>
                        <Link to={`/icon/${code}`}>
                            <div className={`circle n${variantCount}`}>{variantCount}</div>
                        </Link>
                    </td>
                    <td>
                        <Link to={`/icon/${code}`}>
                            <h6>{title}</h6>
                        </Link>
                    </td>
                </>
            :
                <>
                    <td>
                        <div className="circle">{variantCount === 0 ? '?' : variantCount}</div>
                    </td>
                    <td>
                        <h6>{title}</h6>
                    </td>
                </>
            }
        </tr>
    )
};

export default RowBase;