export const enum IconTypes {
    Normal = 1,
    Copy = 1 << 1,
    Delete = 1 << 2,

    All = Normal | Copy | Delete,
}

export class Game {
    public name: string;
    public code?: string;
    public icons?: number;

    constructor(name: string, code?: string, icons?: number) {
        this.name = name;
        this.code = code;
        this.icons = icons;
    }
}