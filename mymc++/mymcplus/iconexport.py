"""Utility functions for exporting icons as 3D models, with textures and animations."""

from functools import reduce
import hashlib
import json
import os
from PIL import Image

def export_iconsys(path, iconsys, icon_dict):
    """Export iconsys.json and all other assets."""
    for icon_filename in icon_dict:
        export_variant(path, icon_filename, icon_dict[icon_filename])

    hx = lambda number: format(number, '02x') # Convert number to hex with no prefix + minimum 2 chars.
    arr_to_col = lambda arr: '#' + hx(arr[0]) + hx(arr[1]) + hx(arr[2]) # Convert array of 3 numbers to hex color.

    # Must match IconSys.tsx.
    iconsysoutput = {
        "title": iconsys.get_title_joined("ascii"),
        "normal": iconsys.icon_file_normal,
        "copy": iconsys.icon_file_copy,
        "delete": iconsys.icon_file_delete,
        "bgOpacity": iconsys.background_transparency,
        "bgColTL": arr_to_col(iconsys.bg_colors[0]),
        "bgColTR": arr_to_col(iconsys.bg_colors[1]),
        "bgColBL": arr_to_col(iconsys.bg_colors[2]),
        "bgColBR": arr_to_col(iconsys.bg_colors[3]),
        "light1Dir": SingleLineList(list(iconsys.light_dirs[0])),
        "light2Dir": SingleLineList(list(iconsys.light_dirs[1])),
        "light3Dir": SingleLineList(list(iconsys.light_dirs[2])),
        "light1Col": SingleLineList(list(iconsys.light_colors[0])),
        "light2Col": SingleLineList(list(iconsys.light_colors[1])),
        "light3Col": SingleLineList(list(iconsys.light_colors[2])),
        "ambiLightCol": SingleLineList(list(iconsys.ambient_light_color)),
    }
    with open(f"{path}/iconsys.json", 'w') as file:
        output = json.dumps(iconsysoutput, indent = 4, separators = (',', ':'), cls = CustomJSONEncoder)
        output = output.replace('"##<', "").replace('>##"', "").replace("'", '"')
        file.write(output)
    print(f"Wrote {path}/iconsys.json")

    # Attempt to consolidate duplicates
    files = dir_files(path)
    image_files = list(filter(lambda f: f.endswith(".png"), files))
    image_md5s = list(map(lambda f: md5_file(f), image_files))
    print(image_md5s)

    for i in range(len(icon_dict) - 1, 0, -1):
        if (image_md5s[i] == image_md5s[i - 1]):
            image_filename = image_files[i]
            files.pop(files.index(image_filename))
            image_files.pop(i)
            image_md5s.pop(i)

    print("done")


def export_variant(path, icon_filename, icon):
    """Export all assets for an icon variant: obj, texture & anim."""
    full_path_without_extension = f"{path}{icon_filename}"
    # Write OBJ
    with open(f"{full_path_without_extension}.obj", 'w') as obj:
        obj.write("# OBJ file\n")
        # Output 'mtllib' row (which material library to load materials from)
        obj.write(f"mtllib {icon_filename}.mtl\n")
        # Output 'v' rows (vertices positions).
        range_x = abs(min(icon.vertex_data[0::3]) - max(icon.vertex_data[0::3]))
        range_y = abs(min(icon.vertex_data[1::3]) - max(icon.vertex_data[1::3]))
        range_z = abs(min(icon.vertex_data[2::3]) - max(icon.vertex_data[2::3]))
        range_max = max([range_x, range_y, range_z])
        for vertex_index in range(icon.vertex_count):
            vertex_x = -icon.vertex_data[vertex_index * 3] / range_max
            vertex_y = -icon.vertex_data[vertex_index * 3 + 1] / range_max
            vertex_z = icon.vertex_data[vertex_index * 3 + 2] / range_max
            vertex_r = icon.color_data[vertex_index * 4 + 0] / 255  # Colors are stored as 8 bit ints in RGBA, must store them as a float so divide by max number of 8 bits.
            vertex_g = icon.color_data[vertex_index * 4 + 1] / 255
            vertex_b = icon.color_data[vertex_index * 4 + 2] / 255
            vertex_a = icon.color_data[vertex_index * 4 + 3] / 255
            obj.write(f"v {vertex_x:.6f} {vertex_y:.6f} {vertex_z:.6f} {vertex_r:.6f} {vertex_g:.6f} {vertex_b:.6f} #{vertex_a:.6f}\n")
        # Output 'vt' rows (UV mappings)
        for uv_index in range(icon.vertex_count):
            u = round(icon.uv_data[uv_index * 2] / 4096, 6)   # Divide by 4096 because that's supposedly the max u/v value?
            v = round(icon.uv_data[uv_index * 2 + 1] / 4096, 6)
            obj.write(f"vt {u:.6f} {v:.6f} 0.000000\n")
        # Output 'vn' rows (vertex normals)
        for normal_index in range(icon.vertex_count):
            normal_x = icon.vertex_normals[normal_index * 3]
            normal_y = icon.vertex_normals[normal_index * 3 + 1]
            normal_z = icon.vertex_normals[normal_index * 3 + 2]
            obj.write(f"vn {normal_x:.6f} {normal_y:.6f} {normal_z:.6f}\n")
        # Output 'usemtl' row (which material to use for the following faces)
        obj.write("usemtl Texture\n")
        # Output 'f' rows (faces connected to which vertices).
        for face_index in range(int(icon.vertex_count / 3)):
            v1 = face_index * 3 + 1
            v2 = face_index * 3 + 2
            v3 = face_index * 3 + 3
            obj.write(f"f {v1}/{v1}/{v1} {v2}/{v2}/{v2} {v3}/{v3}/{v3}\n")
    print(f"Wrote {full_path_without_extension}.obj")

    # Write MTL
    with open(f"{full_path_without_extension}.mtl", 'w') as mtl:
        mtl.write("newmtl Texture\n")
        mtl.write(f"map_Kd {icon_filename}.png\n")
    print(f"Wrote {full_path_without_extension}.mtl")

    # Write PNG
    image = Image.new('RGB', (128, 128), color='black')
    step_size = 2
    for i in range(0, len(icon.texture), step_size):
        x = int((i / step_size) % 128)
        y = 127 - int((i / step_size) / 128)
        col = reduce(lambda a, b: ((a) << 8) | b, icon.texture[i:i+step_size][::-1]) # [::-1] reverses the array 2 element array.
        r = (col & 0x1F) << 3
        g = ((col >> 5) & 0x1F) << 3
        # This blue channel part differs from the c++ implementation because we can't force to an unsigned byte.
        # For some reason this channel for compressed icons will always be 0b10000000 making blue always max, giving everything a blue tint.
        b = (((col >> 10)) << 3) & 0xFF 
        a = 255
        image.putpixel((x, y), (r, g, b, a))
    image.save(f'{full_path_without_extension}.png', 'PNG', optimize=True)
    print(f"Wrote {full_path_without_extension}.png")

    # Write ANIM (if required).
    frames = int(len(icon.vertex_data) / icon.vertex_count / 3)
    if icon.anim_header.frame_count <= 1:
        print("Not writing animation file because only 1 frame")
    else:
        anim_data = {
            "frameLength": icon.anim_header.frame_length,
            "animSpeed": icon.anim_header.anim_speed,
            "playOffset": icon.anim_header.play_offset,
            "frames": [],
        }
        for frame_index in range(frames):
            frame = { "keys" : [], "vertexData": SingleLineList([]) }
            v_from = frame_index * (icon.vertex_count * 3)
            v_to = (frame_index + 1) * (icon.vertex_count * 3)
            frame["vertexData"] = SingleLineList(icon.vertex_data[v_from:v_to])
            # Normalise all vertex coords so everything isn't too large (0.0 - 1.0) is ideal.
            for i in range(len(frame["vertexData"])):
                frame["vertexData"][i] = frame["vertexData"][i] / range_max

            # Write key data.
            for key_index in range(icon.frames[frame_index].key_count):
                frame["keys"].append(SingleLineObject({
                    "time": icon.frames[frame_index].keys[key_index].time,
                    "value": icon.frames[frame_index].keys[key_index].value,
                }))

            anim_data["frames"].append(frame)
        with open(f"{full_path_without_extension}.anim", 'w') as file:
            output = json.dumps(anim_data, indent = 4, separators = (',', ':'), cls = CustomJSONEncoder)
            output = output.replace('"##<', "").replace('>##"', "").replace("'", '"')
            file.write(output)
        print(f"Wrote {full_path_without_extension}.anim ({frames} frames)")

def md5_file(path):
    """Get MD5 hash of file at given path."""
    md5_hash = hashlib.md5()
    with open(path, "rb") as file:
        while chunk := file.read(4096):  # Read the file in 4KB chunks
            md5_hash.update(chunk)
    return md5_hash.hexdigest()

def md5_object(obj):
    """Get MD5 hash of an object."""
    obj_str = repr(obj).encode('utf-8')  # Convert object to its string representation and encode to bytes
    md5_hash = hashlib.md5(obj_str)
    return md5_hash.hexdigest()

def dir_files(directory_path):
    """Get list of files in directory_path."""
    files = []
    for filename in os.listdir(directory_path):
        file_path = os.path.join(directory_path, filename)
        if os.path.isfile(file_path):
            files.append(file_path)
    return files

# Hacky JSON converters to export objects and lists with set prefixes and suffixes mixed in, which can then be string replaced in order to have that 
# entire object or list printed on a singular line. Useful for things like a very long vertex coordinates array.
class SingleLineObject:
    """An object that gets serialised without newlines if serialised with CustomJSONEncoder"""
    object = None
    def __init__(self, object):
        self.object = object

    def __getitem__(self, key):
        return self.object[key]
    
    def __setitem__(self, key, value):
        self.object[key] = value

class SingleLineList:
    """A list that gets serialised without newlines if serialised with CustomJSONEncoder"""
    list = None
    def __init__(self, list):
        self.list = list
    
    def __len__(self):
        return len(self.list)
    
    def __getitem__(self, key):
        return self.list[key]
    
    def __setitem__(self, key, value):
        self.list[key] = value

class CustomJSONEncoder(json.JSONEncoder):
    """
        JSON Encoder that adds special wrapping characters for SingleLineObject/List.
        Remember to string replace the special sequences with empty strings.
    """
    def default(self, item):
        if isinstance(item, SingleLineObject):
            return "##<{}>##".format(item.object)
        if isinstance(item, SingleLineList):
            return "##<{}>##".format(item.list)