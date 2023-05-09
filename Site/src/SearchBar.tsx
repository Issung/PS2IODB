import React from 'react';
import { useState } from 'react';

interface Props {
    onChange: (event: React.ChangeEvent<HTMLInputElement> & { keywords: string[] }) => void;
}

const SearchBar: React.FC<Props> = ({ onChange }) => {
    const similies: string[][] = [
        ['i', '1', 'one'],
        ['ii', '2', 'two'],
        ['iii', '3', 'three'],
        ['iv', '4', 'four'],
        ['v', '5', 'five'],
        ['vi', '6', 'six'],
        ['vii', '7', 'seven'],
        ['viii', '8', 'eight'],
        ['ix', '9', 'nine'],
        ['x', '10', 'ten'],
        ['xi', '11', 'eleven'],
        ['xii', '12', 'twelve'],
        ['xiii', '13', 'thirteen'],
        ['xiv', '14', 'fourteen'],
        ['xv', '15', 'fifteen'],
        ['and', '&']
    ];

    const [value, setValue] = useState('');

    const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(event.target.value);
        var value = event.target.value;
        var enteredWords = value.split(' ').map(w => w.toLowerCase());
        let keywords: string[] = [];
        
        enteredWords.forEach(word => {
            var similieFound = false;
            similies.forEach(simileList => {
                if (simileList.includes(word)) {
                    keywords = keywords.concat(simileList);
                    similieFound = true;
                    return; // Stop the loop.
                }
            });

            if (!similieFound) {
                keywords = keywords.concat(word);
            }
        });

        onChange({ ...event, keywords });
    };

    return (
        <input
            type="text"
            value={value}
            onChange={handleInput}
        />
    );
}

export default SearchBar;