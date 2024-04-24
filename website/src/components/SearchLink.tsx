import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface SearchLinkProps {
    /** Child HTML inside component. */
    children: ReactNode;
    
    /** Href to hyperlink to, with _ to be replaced by 'value' prop. */
    to: string;

    /** The value for this link to link to. */
    value: string;

    /** The current value the user is viewing. */
    currentValue: string | undefined;

    /** Mouse hover tooltip (title). */
    tooltip: string;

    /** Aditional classNames to add to div element. Use for bootstrap cols. */
    className: string;
}

const SearchLink = (props: SearchLinkProps) => {
    const defaults = [
        "category", // "category" is the default search type.
        "misc",     // "misc" is the default index for "alphabetical" search type.
        "icons"     // "icons" is the default index for "category" search type.
    ]

    const selected = 
        props.currentValue === props.value  // This link is selected if the set value is equal to the current value.
        || (props.currentValue === undefined && defaults.some(d => d == props.value));   // Or if the current value is null and the set value is one of the defaults.

    return (
        <div className={`${props.className || ''} ${selected ? 'selected' : ''} search-type`}>
            <Link to={props.to.replaceAll('_', props.value)} title={props.tooltip}>
                <h2>{props.children}</h2>
            </Link>
        </div>
    )
};

export default SearchLink;