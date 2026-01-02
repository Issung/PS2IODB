/**
 * JSON formatter that allows marking certain values to be serialized on a single line.
 * Similar to Python's CustomJSONEncoder with SingleLineObject/SingleLineList.
 */

const SINGLE_LINE_PREFIX = 'singleline##<';
const SINGLE_LINE_SUFFIX = '>##';

/**
 * Creates a replacer function for JSON.stringify that marks specified keys for single-line output.
 * @param shouldBeSingleLine A function that determines if a key's value should be on a single line.
 * @returns A replacer function for JSON.stringify.
 */
function createReplacer(shouldBeSingleLine: (key: string, value: unknown) => boolean) {
    return function replacer(this: unknown, key: string, value: unknown): unknown {
        if (key && shouldBeSingleLine(key, value)) {
            // Serialize the value to JSON and wrap it with markers
            return SINGLE_LINE_PREFIX + JSON.stringify(value) + SINGLE_LINE_SUFFIX;
        }
        return value;
    };
}

/**
 * Post-processes the JSON string to unwrap single-line marked values.
 * Removes the marker strings and surrounding quotes to inline the JSON.
 * Also removes spaces after colons to match Python's separators=(',', ':').
 */
function postProcess(json: string): string {
    // Remove spaces after colons (matches Python's separators=(',', ':'))
    let result = json.replace(/": /g, '":');

    // Replace "singleline##<...>##" with the actual JSON content
    // The pattern matches: "singleline##<{...}>##" and replaces with {...}
    result = result.replace(
        new RegExp(`"${SINGLE_LINE_PREFIX}(.+?)${SINGLE_LINE_SUFFIX}"`, 'g'),
        (_, content) => {
            // The content is already JSON, but it was escaped when embedded in the outer string
            // We need to unescape it (e.g., \" becomes ")
            return content.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
    );

    return result;
}

/**
 * Stringify an object to JSON with specified keys' values on single lines.
 * @param value The value to stringify.
 * @param indent The indentation (number of spaces or string).
 * @param shouldBeSingleLine A function that returns true if a key's value should be on a single line.
 * @returns The formatted JSON string.
 */
export function stringifyWithSingleLines(
    value: unknown,
    shouldBeSingleLine: (key: string, value: unknown) => boolean
): string {
    const replacer = createReplacer(shouldBeSingleLine);
    const json = JSON.stringify(value, replacer, '\t');
    return postProcess(json);
}

/**
 * Format iconsys object to match Python iconexport.py output.
 * Light direction/color arrays are placed on single lines.
 */
export function formatIconSys(iconSys: object): string {
    return stringifyWithSingleLines(iconSys, (key) => {
        // Light arrays should be on single lines
        return key.startsWith('light') || key === 'ambiLightCol';
    });
}

/**
 * Format animation data to match Python iconexport.py output.
 * Key objects and vertexData arrays are placed on single lines.
 */
export function formatAnim(animData: unknown): string {
    return stringifyWithSingleLines(animData, (key, value) => {
        // vertexData arrays should be on single lines
        if (key === 'vertexData') return true;
        // Key objects (with time/value) should be on single lines
        if (typeof value === 'object' && value !== null && 'time' in value && 'value' in value) {
            return true;
        }
        return false;
    });
}

