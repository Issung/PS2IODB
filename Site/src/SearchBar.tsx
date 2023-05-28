import React from 'react';
import { useState } from 'react';

interface SearchBarProps {
    text?: string;
    keywords: string[];
    onKeywordsChange: (newKeywords: string[]) => void;
}

const SearchBar: React.FC<SearchBarProps> = (props: SearchBarProps) => {
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

    const [text, setText] = useState('');
    const [keywords, setKeywords] = useState(Array<string>);

    const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        setText(event.target.value);
        var value = event.target.value;
        var enteredWords = value.split(' ').map(w => w.toLowerCase());
        let enteredKeywords: string[] = [];
        
        enteredWords.forEach(word => {
            var similieFound = false;
            similies.forEach(simileList => {
                if (simileList.includes(word)) {
                    enteredKeywords = enteredKeywords.concat(simileList);
                    similieFound = true;
                    return; // Stop the loop.
                }
            });

            if (!similieFound) {
                enteredKeywords = enteredKeywords.concat(word);
            }
        });

        setKeywords(enteredKeywords);
        props.onKeywordsChange(enteredKeywords);

        console.log(`entry: ${event.target.value}, keywords: ${enteredKeywords.join(', ')}`);
    };

    return (
        <input
            type="text"
            placeholder="Enter Game Title Here"
            value={text}
            onChange={handleInput}
            style={{width: "100%", height: 40, color: "black"}}
        />
    );
}

export default SearchBar;