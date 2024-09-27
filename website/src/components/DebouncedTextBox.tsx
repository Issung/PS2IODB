import React, { useState, useEffect } from "react";
import './DebouncedTextBox.scss'

interface DebouncedTextBoxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string;
    debouncedOnChange: (newValue: string) => void;
}

const DebouncedTextBox = (props: DebouncedTextBoxProps) => {
    const [inputValue, setInputValue] = useState(props.value);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (inputValue != props.value) {
                props.debouncedOnChange(inputValue);
            }
        }, 250);

        return () => {
            clearTimeout(handler);
        };
    }, [inputValue, props.debouncedOnChange]);

    useEffect(() => {
        setInputValue(props.value);
    }, [props.value])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    return <input
        type="text"
        {...props}
        value={inputValue}
        onChange={handleInputChange}
    />;
};

export default DebouncedTextBox;
