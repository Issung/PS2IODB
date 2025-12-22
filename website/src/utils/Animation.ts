export interface Key {
    time: number;
    value: number;
}

export class Timeline {
    constructor(private readonly keys: Key[]) {}

    public evaluate(time: number) {
        if (time <= this.keys[0].time) {
            return this.keys[0].value;
        }
        if (time >= this.keys[this.keys.length - 1].time) {
            return this.keys[this.keys.length - 1].value;
        }
        
        for(let i = 1; i < this.keys.length; i++) {
            const k0 = this.keys[i - 1];
            const k1 = this.keys[i];

            if (k0.time <= time && time < k1.time) {
                const dt = k1.time - k0.time;
                if (dt == 0) {
                    return k0.value;
                }
                const alpha = (time - k0.time) / dt;
                return (1 - alpha) * k0.value + alpha * k1.value;
            }
        }

        throw new Error("Unreachable code");
    }
}