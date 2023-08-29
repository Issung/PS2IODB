/**
 * Documentation: https://www.ps2savetools.com/documents/iconsys-format/
 * Must mirror `iconsys_dto.py` from MYMC++ program.
 */
export class IconSys 
{
    // Background colors opacity. Integer, range from 0 - 256.
    public bgOpacity: number = 0;
    
    // Background color in each corner, abbreviations = topleft, bottomright, etc.
    // Hex color strings e.g. "#72b099".
    public bgColTL: string = "";
    public bgColTR: string = "";
    public bgColBL: string = "";
    public bgColBR: string = "";

    // Light details.
    // Directions are arrays of 4 floats ranging 0.0 - 1.0 representing ...(?).
    public light1Dir: number[] = [];
    public light2Dir: number[] = [];
    public light3Dir: number[] = [];
    // Lights are arrays of 4 floats ranging 0.0 - 1.0 representing r, g, b & unknown (intensity?).
    public light1Col: number[] = [];
    public light2Col: number[] = [];
    public light3Col: number[] = [];
    public ambiLightCol: number[] = [];

    // Both titles of the save joined.
    public title: string = '';
    
    // Filenames of the normal, copy & delete icons.
    public normal: string = "";
    public copy: string = "";
    public delete: string = "";
}