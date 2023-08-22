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
    // Directions are arrays of 4 floats ranging 0.0 - 1.0 representing ...(?)
    public light1Dir: number[] = [];
    public light2Dir: number[] = [];
    public light3Dir: number[] = [];
    // Lights are arrays of 4 floats ranging 0.0 - 1.0 representing r, g, b & unknown.
    public light1Col: number[] = [];
    public light2Col: number[] = [];
    public light3Col: number[] = [];
    public ambiLightCol: number[] = [];

    // Both titles of the save joined
    public title: string = '';

    // List of icon files filenames that were in the save directory.
    public filenames: string[] = [];
    
    // The index in filenames that each file state was supposed to use.
    public normalFilename: number = 0;
    public copyFilename: number = 0;
    public deleteFilename: number = 0;

    // Which obj file to load for each different icon state.
    public normalObj: number = 0;
    public copyObj: number = 0;
    public deleteObj: number = 0;

    // Which animation file to load for each different icon state.
    // If not set then attempt to load animation with same filename.
    // If set then it is an abnormal case where the anim filename does not match the obj filename, load that anim instead.
    public normalAnim: number | null = null;
    public copyAnim: number | null = null;
    public deleteAnim: number | null = null;
}