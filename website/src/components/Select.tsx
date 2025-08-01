import React, { ReactNode, useCallback } from 'react';
import './Select.scss'

export class SelectItem {
    /**
     * Constructs a new SelectItem.
     * 
     * @param key - Unique identifier for the select item.
     * @param name - Display name of the select item.
     * @param icon - Icon to be displayed for the select item.
     */
    constructor(
        public key: string,
        public name: string,
        public tooltip?: string,
        public icon?: ReactNode
    ) {
    }
}

interface ISelectProps {
    /** Unique id for the radio buttons group. */
    groupName: string;
    items: SelectItem[];
    defaultKey: string;
    selectedKey: string | undefined;
    onChange: (newKey: string) => void;
    /** Apply custom bootstrap col rules to this element for better layout of options. */
    col?: string;
};

export const Select = ({groupName, items, defaultKey, selectedKey, onChange, col}: ISelectProps) => {
    return (
        <div className="Select row justify-content-center">
            <div className={(col ?? 'col') + ' d-flex justify-content-center'}>
                {items.map(item =>
                    <React.Fragment key={item.key}>
                        <input
                            type="radio"
                            className="btn-check"
                            name={groupName}
                            id={item.key}
                            checked={(selectedKey ?? defaultKey) === item.key}
                            onChange={() => onChange(item.key)}
                        />
                        <label className="btn btn-secondary" htmlFor={item.key} title={item.tooltip}>
                            <span>{item.name} {item.icon}</span>
                        </label>
                        <br/>
                    </React.Fragment>
                )}
            </div>
        </div>
    );
};

