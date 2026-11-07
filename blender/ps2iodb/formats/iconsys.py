"""
Writing `icon.sys`, the 964 byte file that tells the PS2 memory card browser a save's title, which icon file to show
for each state, and how to light it and colour the background behind it.

Layout (little endian):
    0    "PS2D"
    4    u16 0
    6    u16 byte offset of the title's second line
    8    u32 0
    12   u32 background opacity (0-128)
    16   4 corners (top left, top right, bottom left, bottom right) of u32[4] RGB_ colour, 0-255
    80   3 light directions, f32[4]
    128  3 light colours, f32[4]
    176  ambient light colour, f32[4]
    192  title, 68 bytes of Shift-JIS, null terminated
    260  normal, copy and delete icon filenames, 64 bytes each, null terminated
    452  512 bytes of zeros
This mirrors `website/src/extractor/ps2iconsys.ts`, which the website uses to read it.
"""

import struct
from dataclasses import dataclass, field

ICON_SYS_SIZE = 964
TITLE_BYTES = 68
FILENAME_BYTES = 64


class IconSysError(Exception):
    pass


@dataclass
class IconSys:
    title_line1: str
    title_line2: str = ''
    normal: str = 'icon.ico'
    copy: str = 'icon.ico'
    delete: str = 'icon.ico'
    bg_opacity: int = 96
    # Corners: top left, top right, bottom left, bottom right. Each (r, g, b) 0-255.
    bg_colors: list = field(default_factory=lambda: [(0, 0, 0)] * 4)
    # Three (x, y, z) directions and three (r, g, b) colours, 0.0-1.0.
    light_dirs: list = field(default_factory=lambda: [(0.0, 0.0, 1.0)] * 3)
    light_colors: list = field(default_factory=lambda: [(0.5, 0.5, 0.5)] * 3)
    ambient: tuple = (0.3, 0.3, 0.3)


def to_fullwidth(text: str) -> str:
    """
    Convert printable ASCII to its full-width form, as PS2 games do for save titles.
    The PS2 browser shows half-width ASCII too, but full-width is what nearly every game uses and matches its font.
    """
    out = []
    for ch in text:
        if ch == ' ':
            out.append('　')
        elif '!' <= ch <= '~':
            out.append(chr(ord(ch) - 0x21 + 0xFF01))
        else:
            out.append(ch)
    return ''.join(out)


def encode_title(line1: str, line2: str, fullwidth: bool = True):
    """Return the encoded title bytes and the byte offset where line 2 starts."""
    if fullwidth:
        line1, line2 = to_fullwidth(line1), to_fullwidth(line2)
    try:
        # cp932 is Microsoft's Shift-JIS, a superset that covers more symbols. It's what PS2 tools generally use.
        encoded1 = line1.encode('cp932')
        encoded2 = line2.encode('cp932')
    except UnicodeEncodeError as e:
        raise IconSysError(f"The title contains a character that can't be shown on a PS2: {e.object[e.start:e.end]!r}.")
    if len(encoded1) + len(encoded2) > TITLE_BYTES - 1:
        raise IconSysError(f"The title is too long. It must fit in {TITLE_BYTES - 1} bytes and is "
                           f"{len(encoded1) + len(encoded2)} (full-width characters take 2 bytes each).")
    return encoded1 + encoded2, len(encoded1)


def _fixed_string(value: str, size: int, what: str) -> bytes:
    encoded = value.encode('ascii')
    if len(encoded) >= size:
        raise IconSysError(f"{what} '{value}' is too long, it must be under {size} characters.")
    return encoded.ljust(size, b'\0')


def write_icon_sys(icon_sys: IconSys, fullwidth_title: bool = True) -> bytes:
    title, line2_offset = encode_title(icon_sys.title_line1, icon_sys.title_line2, fullwidth_title)

    out = bytearray()
    out += b'PS2D'
    out += struct.pack('<HHII', 0, line2_offset, 0, max(0, min(255, int(icon_sys.bg_opacity))))
    for r, g, b in icon_sys.bg_colors:
        out += struct.pack('<4I', *(max(0, min(255, int(round(c)))) for c in (r, g, b)), 0)
    for x, y, z in icon_sys.light_dirs:
        out += struct.pack('<4f', x, y, z, 0.0)
    for r, g, b in icon_sys.light_colors:
        out += struct.pack('<4f', r, g, b, 0.0)
    out += struct.pack('<4f', *icon_sys.ambient, 0.0)
    out += title.ljust(TITLE_BYTES, b'\0')
    for filename, what in ((icon_sys.normal, 'Normal icon filename'),
                           (icon_sys.copy, 'Copy icon filename'),
                           (icon_sys.delete, 'Delete icon filename')):
        out += _fixed_string(filename, FILENAME_BYTES, what)
    out += b'\0' * (ICON_SYS_SIZE - len(out))
    assert len(out) == ICON_SYS_SIZE
    return bytes(out)
