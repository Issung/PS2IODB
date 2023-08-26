"""Utility functions for exporting icons as 3D models, with textures and animations."""

from functools import reduce
import json
from PIL import Image
from mymcplus.customjson import CustomJSONEncoder, SingleLineList, SingleLineObject

from mymcplus.iconsys_dto import IconSysDto

def export_iconsys(path, iconsys, icon_dict):
    """Export iconsys.json and all other assets."""
    for index, icon_filename in enumerate(icon_dict):
        export_variant(path, index, icon_dict[icon_filename])

    with open(f"{path}/iconsys.json", 'w') as file:
        dto = IconSysDto.from_iconsys(iconsys)
        output = dto.to_json()
        file.write(output)
    print(f"Wrote {path}/iconsys.json")

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
    image.save(f'{full_path_without_extension}.png', 'PNG')
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