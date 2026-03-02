/**
 * `undefined` = no animation file for any state (whether or not animation files are present).
 * 
 * `null` = all state animation files are redundant static animations.
 * 
 * `1` = Atleast one of the icon states has an animation & the icon is using V1 animation data.
 * 
 * `2` = Atleast one of the icon states has an animation & the icon is using V2 animation data.
 * 
 * `3` = Atleast one of the icon states has an animation & the icon is using V3 animation data.
 **/
export type AnimationVersion = undefined | null | 1 | 2 | 3;
