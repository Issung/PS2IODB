"""
Importing icons downloaded from PS2IODB: the `ps2iodb_<code>.zip` from an icon's page, the same files extracted to a
folder, or a single `.obj`.

Each icon file becomes a mesh object. Its animation (`.anim`) becomes shape keys, one per PS2 shape, with keyframed
values that blend between them exactly as the website plays them back.
"""

import json
import os
import re
import tempfile
import unicodedata
import zipfile

import bpy
from bpy.props import BoolProperty, EnumProperty, StringProperty
from bpy_extras.io_utils import ImportHelper

from . import fcurves, properties
from .formats import anim, coords
from .formats.obj import parse_mtl_texture, parse_obj

STATES = ('normal', 'copy', 'delete')
# The PS2 browser fits about this many full-width characters on a title line.
TITLE_LINE_LENGTH = 16


class IconImportError(Exception):
    pass


class IconSource:
    """The files of a downloaded icon, from a zip or a folder, looked up by name case-insensitively."""

    def __init__(self, path):
        self.zip = None
        if zipfile.is_zipfile(path):
            self.zip = zipfile.ZipFile(path)
            # Match on the filename alone in case the files were re-zipped inside a folder.
            self.files = {os.path.basename(n).lower(): n for n in self.zip.namelist() if not n.endswith('/')}
            name = os.path.splitext(os.path.basename(path))[0]
            # Downloads are named ps2iodb_<code>.zip.
            self.code = name[len('ps2iodb_'):] if name.lower().startswith('ps2iodb_') else name
        else:
            folder = path if os.path.isdir(path) else os.path.dirname(path)
            self.files = {n.lower(): os.path.join(folder, n) for n in os.listdir(folder)}
            self.code = os.path.basename(os.path.normpath(folder))

    def has(self, name):
        return name.lower() in self.files

    def read(self, name):
        path = self.files.get(name.lower())
        if path is None:
            return None
        if self.zip:
            return self.zip.read(path)
        with open(path, 'rb') as f:
            return f.read()

    def text(self, name):
        data = self.read(name)
        return None if data is None else data.decode('utf-8-sig')

    def load_image(self, name):
        """Load an image into Blender. Images from a zip are packed into the .blend file since the zip isn't kept."""
        path = self.files.get(name.lower())
        if path is None:
            return None
        if not self.zip:
            return bpy.data.images.load(path, check_existing=True)
        content = self.zip.read(path)
        with tempfile.TemporaryDirectory() as folder:
            temp_path = os.path.join(folder, os.path.basename(path))
            with open(temp_path, 'wb') as f:
                f.write(content)
            image = bpy.data.images.load(temp_path)
            image.pack(data=content, data_len=len(content))
        return image

    def close(self):
        if self.zip:
            self.zip.close()


def import_icon(context, filepath, states='ALL', merge_vertices=True, custom_normals=True, setup_scene=True):
    """Import an icon, return (objects, warnings)."""
    source = IconSource(filepath)
    warnings = []
    try:
        iconsys = json.loads(source.text('iconsys.json')) if source.has('iconsys.json') else None
        if filepath.lower().endswith('.obj'):
            state_files = {'normal': os.path.basename(filepath)[:-len('.obj')]}
        elif iconsys:
            state_files = {state: iconsys[state] for state in STATES}
        else:
            raise IconImportError("No iconsys.json found. Choose the .zip downloaded from PS2IODB, or the iconsys.json "
                               "or an .obj file inside an extracted download.")
        if states == 'NORMAL':
            state_files = {'normal': state_files['normal']}

        scene = context.scene
        if setup_scene:
            # The PS2 times animations in 60ths of a second, so a 60 fps scene puts keys on whole frames.
            scene.render.fps = 60
            scene.render.fps_base = 1.0
        frames_per_tick = scene.render.fps / scene.render.fps_base / anim.TICKS_PER_SECOND

        collection = bpy.data.collections.new(source.code)
        scene.collection.children.link(collection)

        # Several states can share one icon file, import each file once.
        by_file = {}
        for state, filename in state_files.items():
            by_file.setdefault(filename.lower(), (filename, []))[1].append(state)

        materials = {}
        objects = {}
        for filename, file_states in by_file.values():
            if not source.has(filename + '.obj'):
                warnings.append(f"{filename}.obj is missing, the {' & '.join(file_states)} state was skipped.")
                continue
            name = f"{source.code} ({', '.join(file_states)})"
            obj = _import_file(context, source, filename, name, collection, materials, frames_per_tick,
                               merge_vertices, custom_normals, warnings)
            for state in file_states:
                objects[state] = obj

        if not objects:
            raise IconImportError("None of the icon's .obj files were found.")

        _apply_iconsys(scene.ps2iodb, iconsys, source.code, objects)
        # Show the normal state and, if allowed, set the timeline to its loop. Skips the update callback, which would
        # always set the frame range.
        scene.ps2iodb['preview_state'] = 0
        properties.show_state(scene, 'NORMAL', set_frame_range=setup_scene)

        normal = objects.get('normal') or next(iter(objects.values()))
        for obj in context.view_layer.objects:
            obj.select_set(False)
        normal.select_set(True)
        context.view_layer.objects.active = normal
        return list({id(o): o for o in objects.values()}.values()), warnings
    finally:
        source.close()


def _import_file(context, source, filename, name, collection, materials, frames_per_tick,
                 merge_vertices, custom_normals, warnings):
    data = parse_obj(source.text(filename + '.obj'))
    count = len(data.positions)
    if count == 0:
        raise IconImportError(f"{filename}.obj has no vertices.")

    tracks, length = [], 0
    anim_text = source.text(filename + '.anim')
    if anim_text:
        tracks, length = anim.shape_tracks(json.loads(anim_text))
        if any(len(t.vertex_data) != count * 3 for t in tracks):
            warnings.append(f"{filename}.anim doesn't match {filename}.obj's vertex count, its animation was skipped.")
            tracks, length = [], 0

    basis = [coords.obj_position_to_blender(p) for p in data.positions]
    shapes = [[coords.ps2_to_blender(t.vertex_data[i * 3:i * 3 + 3]) for i in range(count)] for t in tracks]

    # PS2 icons store every triangle corner as its own vertex. Join vertices that share a position in every shape so the
    # mesh is connected and pleasant to edit. UVs, colours and normals are per corner so nothing is lost.
    if merge_vertices:
        lookup, remap, unique = {}, [], []
        for i in range(count):
            key = tuple(round(c, 5) for p in [basis[i]] + [s[i] for s in shapes] for c in p)
            j = lookup.get(key)
            if j is None:
                j = lookup[key] = len(unique)
                unique.append(i)
            remap.append(j)
    else:
        remap, unique = list(range(count)), list(range(count))

    faces, corners = [], []
    for triangle in data.triangles:
        face = [remap[c[0]] for c in triangle]
        if len(set(face)) == 3:  # Triangles collapsed to a line or point by merging are invisible, drop them.
            faces.append(face)
            corners.extend(triangle)

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([basis[i] for i in unique], [], faces)

    if data.uvs:
        uv_layer = mesh.uv_layers.new(name='UVMap')
        uv_layer.data.foreach_set('uv', [c for _, uv, _ in corners for c in (data.uvs[uv] if uv is not None else (0, 0))])
    if data.colors:
        # Byte colours set through color_srgb store the PS2's 0-255 values exactly, so they export unchanged.
        attribute = mesh.color_attributes.new('Color', 'BYTE_COLOR', 'CORNER')
        attribute.data.foreach_set('color_srgb', [c for v, _, _ in corners for c in data.colors[v]])
    mesh.shade_smooth()
    if custom_normals and data.normals:
        # OBJ normals are in PS2 icon space, unlike the positions (see formats/obj.py).
        mesh.normals_split_custom_set([coords.ps2_to_blender(data.normals[n]) if n is not None else (0, 0, 0)
                                       for _, _, n in corners])
    mesh.update()

    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)

    material = _material(source, data.mtllib, filename, materials, has_colors=bool(data.colors))
    if material:
        mesh.materials.append(material)

    if tracks:
        _add_animation(context.scene, obj, [[s[i] for i in unique] for s in shapes], tracks, length, frames_per_tick)
    return obj


def _add_animation(scene, obj, shapes, tracks, length, frames_per_tick):
    obj.shape_key_add(name='Basis', from_mix=False)
    key = obj.data.shape_keys
    action = bpy.data.actions.new(f"{obj.name} Animation")
    key.animation_data_create()
    key.animation_data.action = action

    start = scene.frame_start
    for i, (positions, track) in enumerate(zip(shapes, tracks)):
        block = obj.shape_key_add(name=f"Shape {i}", from_mix=False)
        block.data.foreach_set('co', [c for p in positions for c in p])
        # Some games use weights outside 0-1 to overshoot (NBA 06 dips to -0.07, Gundam to -1). Shape key values are
        # clamped to their slider range, which Blender limits to -10 to 10.
        values = [v for _, v in track.points]
        block.slider_min = max(-10.0, min(0.0, min(values)))
        block.slider_max = min(10.0, max(1.0, max(values)))
        fcurve = fcurves.ensure_fcurve(action, key, f'key_blocks["{block.name}"].value')
        fcurve.keyframe_points.add(len(track.points))
        for point, (time, value) in zip(fcurve.keyframe_points, track.points):
            point.co = (start + time * frames_per_tick, value)
            point.interpolation = 'LINEAR'
        # Loop forever, like the PS2 browser does.
        fcurve.modifiers.new('CYCLES')
        fcurve.update()

    # A cyclic action's frame range is one loop, its end frame looks the same as its start frame.
    # The exporter uses this range as the loop length.
    action.use_frame_range = True
    action.use_cyclic = True
    action.frame_start = start
    action.frame_end = start + length * frames_per_tick


def _material(source, mtllib, filename, materials, has_colors):
    mtl_text = source.text(mtllib or filename + '.mtl')
    texture = parse_mtl_texture(mtl_text) if mtl_text else None
    texture = texture if texture and source.has(texture) else (filename + '.png' if source.has(filename + '.png') else None)
    if texture is None:
        return None
    if texture.lower() in materials:
        return materials[texture.lower()]

    material = bpy.data.materials.new(os.path.splitext(texture)[0])
    if bpy.app.version < (5, 0, 0):
        material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.8

    image_node = nodes.new('ShaderNodeTexImage')
    image_node.image = source.load_image(texture)
    image_node.location = (bsdf.location.x - 600, bsdf.location.y)
    color = image_node.outputs['Color']

    if has_colors:
        # The PS2 multiplies the texture by the vertex colours, as the website does.
        vertex_color = nodes.new('ShaderNodeVertexColor')
        vertex_color.layer_name = 'Color'
        vertex_color.location = (bsdf.location.x - 600, bsdf.location.y - 300)
        mix = nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.location = (bsdf.location.x - 250, bsdf.location.y)
        _socket(mix.inputs, 'Factor_Float').default_value = 1.0
        links.new(color, _socket(mix.inputs, 'A_Color'))
        links.new(vertex_color.outputs['Color'], _socket(mix.inputs, 'B_Color'))
        color = _socket(mix.outputs, 'Result_Color')

    links.new(color, bsdf.inputs['Base Color'])
    materials[texture.lower()] = material
    return material


def _socket(sockets, identifier):
    return next(s for s in sockets if s.identifier == identifier)


def _apply_iconsys(settings, iconsys, code, objects):
    settings.normal_object = objects.get('normal')
    settings.copy_object = objects.get('copy')
    settings.delete_object = objects.get('delete')
    settings.directory = 'PS2IODB-' + re.sub(r'[^A-Za-z0-9_-]', '', code).upper()[:23]
    if not iconsys:
        return

    # Titles are stored in full-width characters, convert them to normal ones for editing. Export converts them back.
    title = unicodedata.normalize('NFKC', iconsys.get('title') or code).strip()
    settings.title_line1, settings.title_line2 = _split_title(title)

    if iconsys.get('bgColTL'):
        # Some games store garbage here (Cart Fury has 0xFFFFFFFF), clamp to what the setting allows.
        settings.bg_opacity = max(0, min(255, int(iconsys.get('bgOpacity', settings.bg_opacity))))
        settings.bg_top_left = _hex_color(iconsys['bgColTL'])
        settings.bg_top_right = _hex_color(iconsys['bgColTR'])
        settings.bg_bottom_left = _hex_color(iconsys['bgColBL'])
        settings.bg_bottom_right = _hex_color(iconsys['bgColBR'])
    for setting, field in [(f'light{i}_direction', f'light{i}Dir') for i in (1, 2, 3)] + \
                          [(f'light{i}_color', f'light{i}Col') for i in (1, 2, 3)] + [('ambient_color', 'ambiLightCol')]:
        values = (iconsys.get(field) or [])[:3]
        # Some files have nulls (Red Faction 2's light directions are NaN in its icon.sys), keep the default for those.
        if len(values) == 3 and all(isinstance(v, (int, float)) for v in values):
            setattr(settings, setting, values)


def _split_title(title):
    """The downloaded title has both lines joined by a space. Split it back near the middle if it's too long for one."""
    if len(title) <= TITLE_LINE_LENGTH:
        return title, ''
    spaces = [i for i, ch in enumerate(title) if ch == ' ']
    if not spaces:
        return title[:TITLE_LINE_LENGTH], title[TITLE_LINE_LENGTH:]
    split = min(spaces, key=lambda i: abs(i - len(title) / 2))
    return title[:split], title[split + 1:]


def _hex_color(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) / 255 for i in (0, 2, 4))


class IMPORT_SCENE_OT_ps2iodb_icon(bpy.types.Operator, ImportHelper):
    """Import a PS2 save icon downloaded from PS2IODB, including its animation"""
    bl_idname = 'import_scene.ps2iodb_icon'
    bl_label = "Import PS2IODB Icon"
    bl_options = {'REGISTER', 'UNDO', 'PRESET'}

    filter_glob: StringProperty(default='*.zip;*.json;*.obj', options={'HIDDEN'})

    states: EnumProperty(
        name="States",
        description="Which of the icon's states to import",
        items=(
            ('ALL', "All", "Import the normal, copy and delete states. Copy and delete are hidden"),
            ('NORMAL', "Normal Only", "Import only the state shown while the save is idle"),
        ),
        default='ALL',
    )
    merge_vertices: BoolProperty(
        name="Merge Vertices",
        description="Join triangle corners that share a position in every animation shape. The PS2 stores each "
                    "corner separately, merging makes the mesh easier to edit and doesn't change how it looks",
        default=True,
    )
    custom_normals: BoolProperty(
        name="Custom Normals",
        description="Use the normals stored in the icon, which the PS2 lights it with",
        default=True,
    )
    setup_scene: BoolProperty(
        name="Set Up Timeline",
        description="Set the scene to 60 fps, the PS2's animation rate, and set the end frame to one animation loop",
        default=True,
    )

    def execute(self, context):
        try:
            objects, warnings = import_icon(context, self.filepath, self.states, self.merge_vertices,
                                            self.custom_normals, self.setup_scene)
        except (IconImportError, OSError, ValueError, KeyError, zipfile.BadZipFile) as e:
            self.report({'ERROR'}, f"Couldn't import icon: {e}")
            return {'CANCELLED'}
        for warning in warnings:
            self.report({'WARNING'}, warning)
        self.report({'INFO'}, f"Imported {len(objects)} icon object(s).")
        return {'FINISHED'}


classes = (IMPORT_SCENE_OT_ps2iodb_icon,)
