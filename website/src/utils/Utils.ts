export class Utils {
    /**
     * https://stackoverflow.com/a/13627586/8306962
     * @returns E.g. 1 = 1st.
     */
    static ordinalSuffixOf(i: number) : string {
        let j = i % 10,
            k = i % 100;

        if (j === 1 && k !== 11) {
            return i + "st";
        }

        if (j === 2 && k !== 12) {
            return i + "nd";
        }

        if (j === 3 && k !== 13) {
            return i + "rd";
        }
        
        return i + "th";
    }    
}