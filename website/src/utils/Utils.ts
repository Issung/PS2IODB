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

    static hexToRgb(hex: string): { r: number, g: number, b: number } {
        hex = hex.replace(/^#/, '');
        const bigint = parseInt(hex, 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
        };
    }
    
    static rgbToHex({ r, g, b }: { r: number, g: number, b: number }): string {
        return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
    }
    
    static averageColor(hexColors: string[]): string {
        let total = { r: 0, g: 0, b: 0 };
        let count = hexColors.length;
        
        hexColors.forEach(hex => {
            let rgb = Utils.hexToRgb(hex);
            total.r += rgb.r;
            total.g += rgb.g;
            total.b += rgb.b;
        });
        
        return Utils.rgbToHex({
            r: Math.round(total.r / count),
            g: Math.round(total.g / count),
            b: Math.round(total.b / count)
        });
    }
}