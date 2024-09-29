"""Utility functions for exporting icons as 3D models, with textures and animations."""

from functools import reduce
import hashlib
import json
import os
import re
from PIL import Image
from mymcplus.jsonencoding import CustomJSONEncoder, SingleLineList, SingleLineObject
from mymcplus.iconsys_dto import IconSysDto
from mymcplus.ps2icon import Icon
from mymcplus.ps2iconsys import IconSys

ICON_ASSETS_FOLDER="icon_exports"
"""Folder to save exported icon assets into."""

MAX_CONST = 4096
"""4096 is used in the ps2iconsys c++ tool to convert f16 to f32 and back, normalising the values stored on the memory card.
   e.g. vertex positions and uv coordinates."""

def export_iconsys(path: str, iconsys: IconSys, icon_dict):
    """Export iconsys.json and all other assets."""
    for icon_filename in icon_dict:
        export_variant(path, icon_filename, icon_dict[icon_filename])

    with open(f"{path}/iconsys.json", 'w') as file:
        dto = IconSysDto.from_iconsys(iconsys)
        output = dto.to_json()
        file.write(output)
    print(f"Wrote {path}/iconsys.json")

    merge_duplicate_images(path)
    print("completed exporting iconsys and removing duplicates")

def export_variant(path: str, icon_filename: str, icon: Icon):
    """Export all assets for an icon variant: obj, texture & anim."""
    icon_filename = clean_icon_filename(icon_filename) # Replace backslashes with hyphens and forward slashes with underscores.
    full_path_without_extension = f"{path}{icon_filename}"
    # Write OBJ
    with open(f"{full_path_without_extension}.obj", 'w') as obj:
        obj.write("# OBJ file\n")

        # Output 'mtllib' row (which material library to load materials from).
        obj.write(f"mtllib {icon_filename}.mtl\n")

        # Output 'v' rows (vertices positions).
        for vertex_index in range(icon.vertex_count):
            vertex_x = -icon.vertex_data[vertex_index * 3] / MAX_CONST
            vertex_y = -icon.vertex_data[vertex_index * 3 + 1] / MAX_CONST
            vertex_z = icon.vertex_data[vertex_index * 3 + 2] / MAX_CONST
            vertex_r = icon.color_data[vertex_index * 4 + 0] / 255  # Colors are stored as 8 bit ints in RGBA, must store them as a float so divide by max number of 8 bits.
            vertex_g = icon.color_data[vertex_index * 4 + 1] / 255
            vertex_b = icon.color_data[vertex_index * 4 + 2] / 255
            vertex_a = icon.color_data[vertex_index * 4 + 3] / 255
            obj.write(f"v {vertex_x:.6f} {vertex_y:.6f} {vertex_z:.6f} {vertex_r:.6f} {vertex_g:.6f} {vertex_b:.6f} #{vertex_a:.6f}\n")

        # Output 'vt' rows (UV mappings)
        for uv_index in range(icon.vertex_count):
            u = round(icon.uv_data[uv_index * 2] / MAX_CONST, 6)
            v = round(icon.uv_data[uv_index * 2 + 1] / MAX_CONST, 6)
            obj.write(f"vt {u:.6f} {v:.6f} 0.000000\n")

        # Output 'vn' rows (vertex normals)
        for normal_index in range(icon.vertex_count):
            normal_x = icon.vertex_normals[normal_index * 3] / MAX_CONST
            normal_y = icon.vertex_normals[normal_index * 3 + 1] / MAX_CONST
            normal_z = icon.vertex_normals[normal_index * 3 + 2] / MAX_CONST
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
                frame["vertexData"][i] = frame["vertexData"][i] / MAX_CONST

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

def merge_duplicate_images(path: str):
    """Check all png files in path, merge them if they are identical, remove redundant mtl files, and update related obj files mtllib references."""
    files = dir_files(path)
    obj_files = list(filter(lambda f: f.endswith(".obj"), files))
    mtl_files = list(filter(lambda f: f.endswith(".mtl"), files))
    png_files = list(filter(lambda f: f.endswith(".png"), files))
    png_md5s = list(map(lambda f: md5_file(f), png_files))
    png_duplicates = find_duplicates(png_md5s)
    if (len(obj_files) != len(mtl_files) != len(png_files)):
        print("Amount of obj, mtl & png files were unexpectedly non equal.")
        return

    # Delete duplicate images and thus .mtl files, alter obj files to reference the remaining .mtl files.
    for duplicate in png_duplicates:
        # Check if file exists before deleting incase it was deleted by other duplicate
        remain_i = duplicate[0]
        remove_i = duplicate[1]
        if os.path.isfile(png_files[remove_i]):
            os.remove(png_files[remove_i])
        if os.path.isfile(mtl_files[remove_i]):
            os.remove(mtl_files[remove_i])
        # Replace mtllib reference in obj file with the remaining file.
        remainingMtlFilename = without_path(mtl_files[remain_i])
        objFilePath = obj_files[remove_i]
        replace_string_in_file(objFilePath, f"^mtllib .*$", f"mtllib {remainingMtlFilename}")

def without_path(path: str) -> str:
    """Get a the last part of a path string, the filename"""
    ret = os.path.basename(os.path.normpath(path))
    return ret

def find_duplicates(md5s: list[str]) -> list[tuple[int, int]]:
    """ Find the duplicates in a list of (md5) strings.
        Returns a list of tuples, e.g. [(0, 1)] meaning item at index 0 was the same as item at index 1.
    """ 
    # Comparisons to make in the case of 3.
    # Compare 0 to 1, 0 to 2 and 1 to 2.
    # Arrows are labeled with their order.
    #                   2
    #      ┌─────────────────────────┐
    #      │                         🠇
    #   ╭─────╮      ╭─────╮      ╭─────╮
    #   |  0  | -3-> |  1  | -1-> |  2  |
    #   ╰─────╯      ╰─────╯      ╰─────╯
    # The order is important because we want the end result to be a "collapse" of all the duplicates.
    # In the case of 2 there is only 1 comparison, and in the case of 1 there is no comparison to be made.
    count = len(md5s)
    duplicates = []

    # Find duplicates.
    if (count == 1):
        pass
    elif (count == 2):
        if (md5s[0] == md5s[1]):
            duplicates.append((0, 1))
    elif (count == 3):
        if (md5s[1] == md5s[2]):
            duplicates.append((1, 2))
        if (md5s[0] == md5s[2]):
            duplicates.append((0, 2))
        if (md5s[0] == md5s[1]):
            duplicates.append((0, 1))

    return duplicates

def replace_string_in_file(file_path: str, match_regex: str, new_string: str):
    """Replace regex matches in file at file_path with new_string"""
    try:
        # Open the file for reading
        with open(file_path, 'r') as file:
            file_content = file.read()

        # Replace the old string with the new string
        modified_content = re.sub(match_regex, new_string, file_content, flags=re.M) #re.M = multiline matches.

        # Open the file for writing (overwrite the content)
        with open(file_path, 'w') as file:
            file.write(modified_content)

        print(f"File '{file_path}' replaced regex matches of '{match_regex}' -> '{new_string}'.")
    except Exception as e:
        print(f"An error replacing text in file: {e}")

def md5_file(path: str) -> str:
    """Get MD5 hash of file at given path."""
    md5_hash = hashlib.md5()
    with open(path, "rb") as file:
        while chunk := file.read(8192):  # Read the file in 8KB chunks
            md5_hash.update(chunk)
    return md5_hash.hexdigest()

def dir_files(directory_path: str) -> list[str]:
    """Get list of files in directory_path."""
    files = []
    for filename in os.listdir(directory_path):
        file_path = os.path.join(directory_path, filename)
        if os.path.isfile(file_path):
            files.append(file_path)
    return files

def clean_icon_filename(filename: str):
    """
    Clean filename for use in export.
    Some games have extra directories for the files which messes up our storage, e.g. Rayman Revolution.
    """
    return filename.replace('\\', '_').replace('/', '-')
