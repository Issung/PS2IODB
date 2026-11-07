"""
Reading the OBJ and MTL files PS2IODB exports.

Blender's own OBJ importer isn't used because PS2IODB's files need special handling:
- Vertex colours are written as `v x y z r g b #a`, with alpha hidden in a comment.
- Positions have X and Y negated from PS2 icon space (to stand the icon upright), but normals were left as they are in
  PS2 icon space, so the two need converting differently.
- The vertex order has to be kept exactly so that `.anim` vertex data, which is indexed the same way, lines up.
"""

from dataclasses import dataclass, field


@dataclass
class ObjData:
    # Per vertex (x, y, z), as written in the file.
    positions: list = field(default_factory=list)
    # Per vertex (r, g, b, a) 0.0-1.0, or None if the file has no vertex colours (very old exports).
    colors: list = None
    uvs: list = field(default_factory=list)
    normals: list = field(default_factory=list)
    # Triangles, each a tuple of 3 (vertex, uv, normal) index tuples. uv and normal indexes may be None.
    triangles: list = field(default_factory=list)
    mtllib: str = None


def parse_obj(text: str) -> ObjData:
    obj = ObjData()
    colors = []
    for line in text.splitlines():
        if line.startswith('v '):
            code, _, comment = line.partition('#')
            values = [float(v) for v in code.split()[1:]]
            obj.positions.append(tuple(values[:3]))
            if len(values) >= 6:
                alpha = float(comment) if comment.strip() else 1.0
                colors.append((values[3], values[4], values[5], alpha))
        elif line.startswith('vt '):
            values = [float(v) for v in line.split()[1:3]]
            obj.uvs.append((values[0], values[1] if len(values) > 1 else 0.0))
        elif line.startswith('vn '):
            obj.normals.append(tuple(float(v) for v in line.split()[1:4]))
        elif line.startswith('f '):
            corners = [_parse_corner(c, obj) for c in line.split()[1:]]
            # Fan triangulate in case of quads, PS2IODB's own exports are always triangles.
            for i in range(1, len(corners) - 1):
                obj.triangles.append((corners[0], corners[i], corners[i + 1]))
        elif line.startswith('mtllib '):
            obj.mtllib = line[len('mtllib '):].strip()

    if colors and len(colors) == len(obj.positions):
        obj.colors = colors
    return obj


def _parse_corner(corner: str, obj: ObjData):
    parts = corner.split('/')

    def index(i, count):
        if len(parts) <= i or not parts[i]:
            return None
        value = int(parts[i])
        return value - 1 if value > 0 else count + value

    return (index(0, len(obj.positions)), index(1, len(obj.uvs)), index(2, len(obj.normals)))


def parse_mtl_texture(text: str):
    """Return the `map_Kd` texture filename from an MTL file, or None."""
    for line in text.splitlines():
        line = line.strip()
        if line.startswith('map_Kd '):
            return line[len('map_Kd '):].strip()
    return None
