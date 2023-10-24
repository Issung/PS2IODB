import json
from mymcplus import iconexport
from mymcplus.jsonencoding import CustomJSONEncoder, SingleLineList
from mymcplus.ps2iconsys import IconSys

class IconSysDto:
    """IconSys DTO class for exporting icon assets.
       Must mirror `IconSys.tsx` from PS2IODB website.
    """
    # Background colors opacity. Integer, range from 0 - 256.
    bgOpacity: int

    # Background color in each corner, abbreviations = topleft, bottomright, etc.
    # Hex color strings e.g. "#72b099".
    bgColTL: str
    bgColTR: str
    bgColBL: str
    bgColBR: str

    # Light details.
    # Directions are arrays of 4 floats ranging 0.0 - 1.0 representing ...(?).
    light1Dir: list[float]
    light2Dir: list[float]
    light3Dir: list[float]
    # Lights are arrays of 4 floats ranging 0.0 - 1.0 representing r, g, b & unknown (intensity?).
    light1Col: list[float]
    light2Col: list[float]
    light3Col: list[float]
    ambiLightCol: list[float]

    # Both titles of the save joined.
    title: str = ""

    # Filenames of the normal, copy & delete icons.
    normal: str
    copy: str
    delete: str

    @staticmethod
    def from_iconsys(iconsys: IconSys) -> 'IconSysDto':
        """Load data from IconSys class format."""
        hx = lambda number: format(number, '02x') # Convert number to hex with no prefix + minimum 2 chars.
        arr_to_col = lambda arr: '#' + hx(arr[0]) + hx(arr[1]) + hx(arr[2]) # Convert array of 3 numbers to hex color.

        new = IconSysDto()
        new.title = iconsys.get_title_joined("ascii")

        new.normal = iconexport.clean_icon_filename(iconsys.icon_file_normal)
        new.copy = iconexport.clean_icon_filename(iconsys.icon_file_copy)
        new.delete = iconexport.clean_icon_filename(iconsys.icon_file_delete)

        new.bgOpacity = iconsys.background_transparency
        new.bgColTL = arr_to_col(iconsys.bg_colors[0])
        new.bgColTR = arr_to_col(iconsys.bg_colors[1])
        new.bgColBL = arr_to_col(iconsys.bg_colors[2])
        new.bgColBR = arr_to_col(iconsys.bg_colors[3])
        new.light1Dir = SingleLineList(list(iconsys.light_dirs[0]))
        new.light2Dir = SingleLineList(list(iconsys.light_dirs[1]))
        new.light3Dir = SingleLineList(list(iconsys.light_dirs[2]))
        new.light1Col = SingleLineList(list(iconsys.light_colors[0]))
        new.light2Col = SingleLineList(list(iconsys.light_colors[1]))
        new.light3Col = SingleLineList(list(iconsys.light_colors[2]))
        new.ambiLightCol = SingleLineList(list(iconsys.ambient_light_color))
    
        return new

    def to_json(self) -> str:
        """Convert self to JSON string."""
        output = json.dumps(
            self.__dict__, 
            indent = 4, 
            separators = (',', ':'),
            cls = CustomJSONEncoder # Custom encoder for single line lists.
        )
        # Replace single line lists wrapping delimiters.
        output = output.replace('"##<', "").replace('>##"', "").replace("'", '"')
        return output

