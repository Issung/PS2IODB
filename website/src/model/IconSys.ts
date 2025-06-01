/**
 * Documentation: https://www.ps2savetools.com/documents/iconsys-format/
 * Must mirror `iconsys_dto.py` from MYMC++ program.
 */
export class IconSys 
{
    // Filenames of the normal, copy & delete icons.
    // Present from the first version of iconsys.json. Should always be populated.
    public normal: string = '';
    public copy: string = '';
    public delete: string = '';

    // iconsys.json v2 fields:

    // Background colors opacity. Integer, range from 0 - 256.
    public bgOpacity: number | undefined;
    
    // Background color in each corner, abbreviations = topleft, bottomright, etc.
    // Hex color strings e.g. "#72b099".
    public bgColTL: string | undefined;
    public bgColTR: string | undefined;
    public bgColBL: string | undefined;
    public bgColBR: string | undefined;

    // Light details.
    // Directions are arrays of 4 floats ranging 0.0 - 1.0 representing ...(?).
    public light1Dir: number[] | undefined;
    public light2Dir: number[] | undefined;
    public light3Dir: number[] | undefined;
    // Lights are arrays of 4 floats ranging 0.0 - 1.0 representing r, g, b & unknown (intensity?).
    public light1Col: number[] | undefined;
    public light2Col: number[] | undefined;
    public light3Col: number[] | undefined;
    public ambiLightCol: number[] | undefined;

    // Both titles of the save joined.
    public title: string | undefined;

    // iconsys.json v3 field (unused on website):
    public directory: string | undefined;
}