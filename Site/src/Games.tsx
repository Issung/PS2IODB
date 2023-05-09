export const enum IconTypes {
    Normal = 1,
    Copy = 1 << 1,
    Delete = 1 << 2,

    All = Normal | Copy | Delete,
}

export class GameEntry {
    constructor(public name: string, public code: string, public icons: IconTypes) { }
}

export const GameList: ReadonlyArray<GameEntry> = [
    new GameEntry('Frequency', "frequency", IconTypes.Normal),
    new GameEntry('Silent Hill 2', "silenthill2", IconTypes.Normal),
    new GameEntry('God of War II', "godofwar2", IconTypes.Normal),
    new GameEntry('Devil May Cry III', "devilmaycry3", IconTypes.All),
    new GameEntry('Grand Theft Auto: Vice City', "gtavicecity", IconTypes.Normal),
    new GameEntry('Beyond Good & Evil', "beyondgoodandevil", IconTypes.Normal),
    new GameEntry('Okami', "okami", IconTypes.Normal | IconTypes.Delete),
    new GameEntry('Ridge Racer V', "ridgeracer5", IconTypes.All),
    new GameEntry('Half-Life', "halflife", IconTypes.Normal | IconTypes.Delete),
];