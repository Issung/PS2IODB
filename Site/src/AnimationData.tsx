export class AnimationData
{
    frameLength: number = -1;
    animationSpeed: number = -1.0;
    playOffset: number = -1;
    frames: AnimationFrame[] = [];
}

export class AnimationFrame 
{
    /**
     * Array of keys for this frame of animation.
     */
    keys: AnimationFrameKey[];

    /**
     * Vertex positions for this frame. Stored in a format of [ x1, y1, z1, x2, y2, z2, x3, ... ].
     */
    vertexData: number[];

    constructor(keys: AnimationFrameKey[], vertexData: number[])
    {
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