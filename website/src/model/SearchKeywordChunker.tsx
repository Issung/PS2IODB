class SearchKeywordChunker {
    /**
     * Each row (array) within this array indicates that one of these words being present in a search should search for the others.
     * E.g. If the user enters '3', then 'iii' and 'three' should also be searched for.
     */
    static similes: string[][] = [
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

    /**
     * Turn 'search' string into an array of words, including breaking specific words into similes.
     */
    static chunk(search: string): string[] {
        var words = search
            .split(' ')
            .map(word => word.toLowerCase().trim())
            .filter(word => word !== ''); // Not null or empty, from the above trim.
        
        // Return either a simile list that contained the word, or just the word if none match.
        let results = words.flatMap(word => this.similes.find(list => list.includes(word)) ?? word);

        console.log(`search entry: ${search}, results: ${results.join(', ')}`);

        return results;
    };
}

export default SearchKeywordChunker;