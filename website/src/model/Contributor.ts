export class Contributor {
    public name: string;
    public link: string | undefined;

    constructor(name: string, link?: string) {
        this.name = name;
        this.link = link;
    }
}
