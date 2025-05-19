import { Contributor } from "./Contributor";

export class Contributors {
    public static GetContributorByName(name: string | undefined): Contributor | undefined {
        return Object.values(Contributors).find(c => c.name == name) as Contributor;
    }

    public static Issung = new Contributor('Issung', 'https://x.com/IssunGee');
    public static Rikineko = new Contributor('rikineko');
    public static NateTool = new Contributor('Nathan Tool', 'https://www.reddit.com/u/NateTool/');
    public static Typedesigns = new Contributor('Typedesigns', 'https://x.com/typedesigns_');
    public static TravisTouchdown = new Contributor('Travis Touchdown', 'https://x.com/TravisTchDown');
    public static VibiLeFleu = new Contributor('VibiLeFleu', 'https://x.com/VibiLeFleu');
    public static Sebita = new Contributor('Sebita', 'https://x.com/Sebitaowo');
    public static ItzCookieX = new Contributor('ItzCookieX', 'https://x.com/chocomuku');
    public static Psiences = new Contributor('psiences', 'https://x.com/psiences');
    public static FenixF = new Contributor('Fenix F', 'https://x.com/_Fenix_F_');
    public static Zwish343 = new Contributor('Zwish343', 'https://x.com/zwish343');
    public static Zeroman95 = new Contributor('Zeroman95', 'https://www.backloggery.com/Zeroman95BL');
    public static Atat111111 = new Contributor('atat111111'); // Brother of Zeroman95. Uploaded by Zeroman95.
    public static Oddworld2001= new Contributor('Oddworld-2001');
    public static SqueezedDog = new Contributor('Squeezed Dog');
    public static NBForever = new Contributor('N & B Forever'); // Uploaded by Squeezed Dog
    public static DrinkMoreWater = new Contributor('Drink More Water!'); // Uploaded by Squeezed Dog
    public static Ps2RomsFree = new Contributor('ps2romsfree', 'https://x.com/ps2romsfree');
    public static Sharpyroos = new Contributor('Sharpyroos'); // Uploaded by Squeezed Dog
    public static Cajas = new Contributor('Cajas');
    public static VideoGameKing = new Contributor('Video_Game_King');
    public static RyutoSetsujin = new Contributor('Ryuto Setsujin', 'https://bsky.app/profile/ryuto.quizmagic.academy');
    public static Pm41224 = new Contributor('pm41224');
    public static Loafhouse = new Contributor('loafhouse');
    public static Mkca = new Contributor('MKCA', 'https://github.com/MKCAMK');
    public static ShawnS = new Contributor('ShawnS', 'https://x.com/ShawnS52');
    public static ZupaPat785 = new Contributor('ZupaPat785');
    public static Jtduckman = new Contributor('jtduckman', 'https://bsky.app/profile/jtduckman.bsky.social');
    public static Everdred = new Contributor('Everdred');
    public static TotallyNotMichael = new Contributor('TotallyNotMichael');
    public static Marc = new Contributor('Marc');
}

export const ContributorCount = Object.values(Contributors).length;