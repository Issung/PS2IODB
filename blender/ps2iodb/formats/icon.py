"""
Reading and writing PS2 icon files (`.ico`), the 3D model format shown in the PS2 memory card browser.

Layout (all little endian):
    header      magic u32 (0x010000), shape count u32, texture type u32, 0x3F800000 u32, vertex count u32
    vertices    per vertex: one (x, y, z, pad) s16 tuple per shape, a normal (x, y, z, pad) s16 tuple,
                a UV (u, v) s16 pair and RGBA u8[4]. Positions, normals and UVs are fixed point, divided by 4096.
    animation   header: id u32 (1), frame length u32, anim speed f32, play offset u32, frame count u32,
                then per frame: shape id u32, key count u32, then key count * (time f32, value f32)
    texture     128x128 16-bit ABBBBBGGGGGRRRRR pixels, row 0 is the bottom of the image.

Every 3 vertices form a triangle, there is no index buffer.
This mirrors `website/src/extractor/ps2icon.ts`, which the website uses to read icons.
"""

import struct
from dataclasses import dataclass, field

MAGIC = 0x010000
HEADER_CONSTANT = 0x3F800000  # Always this value in real icons, it is the float 1.0.
FIXED_POINT = 4096.0
TEXTURE_WIDTH = 128
TEXTURE_HEIGHT = 128
TEXTURE_BYTES = TEXTURE_WIDTH * TEXTURE_HEIGHT * 2
TEXTURE_TYPE_UNCOMPRESSED = 0x07
TEXTURE_FLAG_PRESENT = 0b0100
TEXTURE_FLAG_COMPRESSED = 0b1000

# Fixed point values are signed 16-bit, so anything outside this range can't be stored.
MAX_COORDINATE = 32767 / FIXED_POINT
MIN_COORDINATE = -32768 / FIXED_POINT


class IconError(Exception):
    pass


@dataclass
class Key:
    """A point on a frame's weight timeline. `time` is in 60ths of a second (before `anim_speed` is applied)."""
    time: float
    value: float


@dataclass
class Frame:
    shape_id: int
    keys: list


@dataclass
class Icon:
    # shapes[shape][vertex] = (x, y, z) in PS2 icon space (Y points down).
    shapes: list
    # Per vertex (x, y, z).
    normals: list
    # Per vertex (u, v), v = 0 is the bottom of the texture.
    uvs: list
    # Per vertex (r, g, b, a), 0-255 each.
    colors: list
    frames: list = field(default_factory=list)
    frame_length: int = 1
    anim_speed: float = 1.0
    play_offset: int = 0
    # TEXTURE_BYTES of raw 16-bit pixels, or None for a plain white texture.
    texture: bytes = None

    @property
    def vertex_count(self):
        return len(self.normals)


def _fixed(value, what):
    if not (MIN_COORDINATE <= value <= MAX_COORDINATE):
        raise IconError(f"{what} value {value:.3f} is outside the range the PS2 can store "
                        f"({MIN_COORDINATE:.3f} to {MAX_COORDINATE:.3f}). Scale the model down.")
    return int(round(value * FIXED_POINT))


def write_icon(icon: Icon) -> bytes:
    vertex_count = icon.vertex_count
    if vertex_count == 0 or vertex_count % 3 != 0:
        raise IconError(f"Vertex count must be a non-zero multiple of 3, got {vertex_count}.")
    if not icon.shapes:
        raise IconError("An icon needs at least one shape.")
    for shape in icon.shapes:
        if len(shape) != vertex_count:
            raise IconError("Every shape must have the same number of vertices as the base mesh.")
    if len(icon.uvs) != vertex_count or len(icon.colors) != vertex_count:
        raise IconError("UV and colour counts must match the vertex count.")
    if not icon.frames:
        raise IconError("An icon needs at least one animation frame.")

    out = bytearray()
    out += struct.pack('<5I', MAGIC, len(icon.shapes), TEXTURE_TYPE_UNCOMPRESSED, HEADER_CONSTANT, vertex_count)

    vertex = struct.Struct('<4h')
    uv_color = struct.Struct('<2h4B')
    for i in range(vertex_count):
        for shape in icon.shapes:
            x, y, z = shape[i]
            out += vertex.pack(_fixed(x, 'Vertex'), _fixed(y, 'Vertex'), _fixed(z, 'Vertex'), 0)
        nx, ny, nz = icon.normals[i]
        # Normals are unit length so are always in range, clamp anyway in case of unnormalised custom normals.
        out += vertex.pack(*(int(round(max(-1.0, min(1.0, n)) * FIXED_POINT)) for n in (nx, ny, nz)), 0)
        u, v = icon.uvs[i]
        r, g, b, a = icon.colors[i]
        out += uv_color.pack(_fixed(u, 'UV'), _fixed(v, 'UV'), r, g, b, a)

    out += struct.pack('<IIfII', 1, icon.frame_length, icon.anim_speed, icon.play_offset, len(icon.frames))
    for frame in icon.frames:
        if not (0 <= frame.shape_id < len(icon.shapes)):
            raise IconError(f"Frame references shape {frame.shape_id} but the icon has {len(icon.shapes)} shapes.")
        out += struct.pack('<II', frame.shape_id, len(frame.keys))
        for key in frame.keys:
            out += struct.pack('<ff', key.time, key.value)

    texture = icon.texture if icon.texture is not None else b'\xff' * TEXTURE_BYTES
    if len(texture) != TEXTURE_BYTES:
        raise IconError(f"Texture must be {TEXTURE_BYTES} bytes, got {len(texture)}.")
    out += texture
    return bytes(out)


def read_icon(data: bytes) -> Icon:
    """Parse an icon. Only used by the tests to check what `write_icon` produced, so compressed textures aren't supported."""
    magic, shape_count, texture_type, _, vertex_count = struct.unpack_from('<5I', data, 0)
    if magic != MAGIC:
        raise IconError(f"Invalid magic {magic:#x}.")
    offset = 20

    shapes = [[None] * vertex_count for _ in range(shape_count)]
    normals, uvs, colors = [], [], []
    for i in range(vertex_count):
        for s in range(shape_count):
            x, y, z, _ = struct.unpack_from('<4h', data, offset)
            shapes[s][i] = (x / FIXED_POINT, y / FIXED_POINT, z / FIXED_POINT)
            offset += 8
        nx, ny, nz, _ = struct.unpack_from('<4h', data, offset)
        normals.append((nx / FIXED_POINT, ny / FIXED_POINT, nz / FIXED_POINT))
        offset += 8
        u, v, r, g, b, a = struct.unpack_from('<2h4B', data, offset)
        uvs.append((u / FIXED_POINT, v / FIXED_POINT))
        colors.append((r, g, b, a))
        offset += 8

    tag, frame_length, anim_speed, play_offset, frame_count = struct.unpack_from('<IIfII', data, offset)
    if tag != 1:
        raise IconError(f"Invalid animation header tag {tag:#x}.")
    offset += 20
    frames = []
    for _ in range(frame_count):
        shape_id, key_count = struct.unpack_from('<II', data, offset)
        offset += 8
        keys = []
        for _ in range(key_count):
            time, value = struct.unpack_from('<ff', data, offset)
            keys.append(Key(time, value))
            offset += 8
        frames.append(Frame(shape_id, keys))

    if texture_type & TEXTURE_FLAG_COMPRESSED:
        raise IconError("Compressed textures are not supported.")
    texture = data[offset:offset + TEXTURE_BYTES] if texture_type & TEXTURE_FLAG_PRESENT else None

    return Icon(shapes, normals, uvs, colors, frames, frame_length, anim_speed, play_offset, texture)


def rgba_to_texture(pixels, width: int, height: int) -> bytes:
    """
    Convert 8-bit RGBA pixels (a flat sequence, bottom row first, as Blender's `Image.pixels` stores them scaled to 0-255)
    of a TEXTURE_WIDTH x TEXTURE_HEIGHT image to the PS2's 16-bit format.
    Rounds each channel to the nearest 5-bit value, so a texture exported by PS2IODB (whose channels are the 5-bit value
    shifted left 3) converts back exactly.
    """
    if width != TEXTURE_WIDTH or height != TEXTURE_HEIGHT:
        raise IconError(f"Texture must be {TEXTURE_WIDTH}x{TEXTURE_HEIGHT}, got {width}x{height}.")
    out = bytearray(TEXTURE_BYTES)
    for i in range(TEXTURE_WIDTH * TEXTURE_HEIGHT):
        r, g, b, a = pixels[i * 4:i * 4 + 4]
        r5 = min(31, (r + 4) >> 3)
        g5 = min(31, (g + 4) >> 3)
        b5 = min(31, (b + 4) >> 3)
        # Bit 15 set means opaque.
        pixel = r5 | (g5 << 5) | (b5 << 10) | (0x8000 if a >= 128 else 0)
        out[i * 2] = pixel & 0xFF
        out[i * 2 + 1] = pixel >> 8
    return bytes(out)
