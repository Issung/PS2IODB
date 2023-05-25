/**
 * Documentation: https://www.ps2savetools.com/documents/iconsys-format/
 */
export class IconSys 
{
    public bgOpacity: number = 0;
    public bgColTL: number = 0;
    public bgColTR: number = 0;
    public bgColBL: number = 0;
    public bgColBR: number = 0;

    public light1Dir: number = 0;
    public light2Dir: number = 0;
    public light3Dir: number = 0;
    public light1Col: number = 0;
    public light2Col: number = 0;
    public light3Col: number = 0;
    public ambiLightCol: number = 0;

    public title: string = '';

    public normal: string = '';
    public copy: string = '';
    public delete: string = '';

    constructor() 
    {
    }
}