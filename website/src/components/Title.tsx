import React, { memo } from "react";
import { Icon } from "../model/Icon";
import { Title as TitleModel } from "../model/Title";
import IconRow from "./IconRow";
import RowBase, { Trait } from "./RowBase";
import SingleIconTitleRow from "./SingleIconTitleRow";

interface TitleProps {
    title: TitleModel;
    iconsFilter?: (icon: Icon) => boolean;
}

/** Display a title. */
const Title = ({
    title,
    iconsFilter
}: TitleProps
) => {
    //console.log('Title');

    if (title.icons.length > 1)
    {
        const icons = iconsFilter ? title.icons.filter(iconsFilter) : title.icons;

        return <React.Fragment key={title.index}>
            <RowBase 
                title={title.name}
                contributed={title.icons.some(i => i.code)}
                circle={Trait.MultiIcon}
                tooltip="This title has multiple icons"
            />
            <div className="icons-grid" style={{gridTemplateRows: `repeat(${icons.length}, auto)`}}>
                <div className="line" style={{gridRow: `1 / span ${icons.length}`}}>
                </div>
                {icons.map(icon => <IconRow icon={icon} key={icon.index}/>)}
            </div>
        </React.Fragment>
    }
    else
    {
        return <SingleIconTitleRow title={title} key={title.index}/>
    }
};

export default Title;