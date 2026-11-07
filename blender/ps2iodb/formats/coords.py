"""
Conversions between PS2 icon space and Blender space.

PS2 icons have Y pointing down and face -Z. The website rotates them 180 degrees around Z (negating X and Y) to stand
them upright, and Blender's Z is up, so the combination is a 90 degree rotation around X: Blender (x, y, z) = PS2 (X, Z, -Y).
The icon ends up standing on the origin and facing Blender's front view (-Y). Being a rotation, triangle winding and
therefore which side faces outward is unchanged.
"""


def ps2_to_blender(v):
    x, y, z = v
    return (x, z, -y)


def blender_to_ps2(v):
    x, y, z = v
    return (x, -z, y)


def obj_position_to_blender(v):
    """PS2IODB's OBJ positions have X and Y negated from PS2 icon space."""
    x, y, z = v
    return ps2_to_blender((-x, -y, z))
