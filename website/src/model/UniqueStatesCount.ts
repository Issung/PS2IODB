/**
 * Number of unique states an icon has (idle/copy/delete).
 * An icon may have 3 states but if they are all identical this should be set to `1`.
 * 
 * `undefined` = Icon not contributed. Unknown.
 * 
 * `1 | 2 | 3` = N number of unique states.
 */
export type UniqueStatesCount = undefined | 1 | 2 | 3;
