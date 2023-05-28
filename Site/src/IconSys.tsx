/**
 * Documentation: https://www.ps2savetools.com/documents/iconsys-format/
 */
export class IconSys 
{
    // Background colors details.
    // 2 letter abbreviations are topleft, bottomright, etc.
    public bgOpacity: number = 0;
    public bgColTL: number = 0;
    public bgColTR: number = 0;
    public bgColBL: number = 0;
    public bgColBR: number = 0;

    // Light details.
    // Directions are x, y, z euler angles.
    public light1Dir: number = 0;
    public light2Dir: number = 0;
    public light3Dir: number = 0;
    // Lights are 3 floats ranging 0.0 - 1.0, r, g, b.
    public light1Col: number = 0;
    public light2Col: number = 0;
    public light3Col: number = 0;
    public ambiLightCol: number = 0;

    // Both titles of the save joined
    public title: string = '';

    // Filenames of the normal, copy & delete icons.
    public normal: string = '';
    public copy: string = '';
    public delete: string = '';

    constructor() 
    {
    }
}