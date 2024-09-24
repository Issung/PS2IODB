import React, { useCallback } from 'react';
import './Select.scss'

export class SelectItem {
    key: string;
    name: string;
    icon: string;

    constructor(key: string, name: string, icon: string) {
        this.key = key;
        this.name = name;
        this.icon = icon;
    }
}

interface ISelectProps {
    items: SelectItem[];
    defaultKey: string;
    selectedKey: string | undefined;
    onChange: (newKey: string) => void;
};

export const Select = ({items, defaultKey, selectedKey, onChange}: ISelectProps) => {
    const name = Math.random().toString();

    const getDisplayName = useCallback((key: string) => {
        let item = items.find(i => i.key === key);
        if (!item) {
            throw new Error(`Item with key ${key} not found.`);
        }   
        return `${item.name}${item.icon}`;
    }, [items, defaultKey]);

    return (
        <div className="Select row justify-content-center">
            <div className="col d-flex justify-content-center">
                {items.map(i => i.key).map((key) => (
                    <React.Fragment key={key}>
                        <input
                            type="radio"
                            className="btn-check"
                            name={name}
                            id={key}
                            checked={(selectedKey ?? defaultKey) === key}
                            onChange={() => onChange(key)}
                        />
                        <label className="btn btn-secondary" htmlFor={key}>
                            <p>{getDisplayName(key)}</p>
                        </label>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

