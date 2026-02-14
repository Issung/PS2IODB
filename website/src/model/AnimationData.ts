export class AnimationData
{
    /**
     * Version 2 has the missing frame key fix from techwritescode https://github.com/Issung/PS2IODB/pull/75/files.
     * We need to differentiate so that v1 anim files (with this field absent) can use the old animation playback code.
     * 
     * Version 3 adds shapeId to each animation frame. It is unused in playback code but during the export process the shape id is used to identify which shape
     * this frame wishes to use. Some icons may use shapes in a non-sequential order or leave some shapes unused. A good example is `Combat Queen`.
     */
    version: undefined | 2 | 3;
    frameLength!: number;
    /**
     * Animation speed, a factor to multiply the animation's speed by, e.g. `0.5` for half, or `2` for double speed.
     * We only use it for v2 animation playback since only that has the correct timings.
     * Called `animSpeed` in all the `.anim` files. Seemingly unused in ps2suitcase & mymc++.
     * Compared against PS2 BIOS with Ico, Psychonauts, Red Faction (values of 0.5) & Midnight Club (values of 6, 4 & 1 for different states).
     */
    animSpeed!: number;
    playOffset!: number;
    frames!: AnimationFrame[];
}

export class AnimationFrame 
{
    /**
     * Only present in exports with version >= 3.
     */
    shapeId: undefined | number;

    /**
     * Array of keys for this frame of animation.
     */
    keys: AnimationFrameKey[];

    /**
     * Vertex positions for this frame. Stored in a format of [ x1, y1, z1, x2, y2, z2, x3, ... ].
     */
    vertexData: number[];

    constructor(shapeId: number, keys: AnimationFrameKey[], vertexData: number[])
    {
        this.shapeId = shapeId;
        this.keys = keys;
        this.vertexData = vertexData;
    }
}

export class AnimationFrameKey 
{
    time: number;
    value: number;

    constructor(time: number, value: number) 
    {
        this.time = time;
        this.value = value;
    }
}