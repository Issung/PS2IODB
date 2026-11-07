"""
Exporting icons to a new PS2 memory card image (`.ps2`) holding a save that contains only `icon.sys` and the icons.

The card can be loaded in PCSX2 (for example in slot 2, then copy the save to your own card from the PS2 browser) or
on a real PS2 with an SD card based memory card such as the SD2PSX or MemCard PRO2.

Animation comes from shape keys, or from baking whatever moves the mesh (armatures, modifiers, ...) into shapes.
"""

import math
from contextlib import contextmanager

import bpy
import numpy as np
from bpy.props import BoolProperty, EnumProperty, IntProperty, StringProperty
from bpy_extras.io_utils import ExportHelper

from . import fcurves
from .formats import anim, memcard
from .formats.icon import TEXTURE_HEIGHT, TEXTURE_WIDTH, Frame, Icon, IconError, Key, rgba_to_texture, write_icon
from .formats.iconsys import IconSys, IconSysError, write_icon_sys

# Without a colour attribute, vertices are white, the most common colour in real icons.
DEFAULT_COLOR = (255, 255, 255, 255)


class ExportError(Exception):
    pass


def _fps(scene):
    return scene.render.fps / scene.render.fps_base


def _ticks_per_frame(scene):
    return anim.TICKS_PER_SECOND / _fps(scene)


@contextmanager
def _preserved_state(scene, obj):
    """Restore the current frame and shape key display after exporting, since evaluating shapes changes them."""
    frame, subframe = scene.frame_current, scene.frame_subframe
    show_only, active_index = obj.show_only_shape_key, obj.active_shape_key_index
    try:
        yield
    finally:
        obj.show_only_shape_key = show_only
        obj.active_shape_key_index = active_index
        scene.frame_set(frame, subframe=subframe)


def _set_frame(scene, frame):
    whole = math.floor(frame)
    scene.frame_set(whole, subframe=frame - whole)


def _world_positions(obj, depsgraph):
    """Vertex positions of the evaluated (deformed, modified) mesh in world space, as an (n, 3) array."""
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        co = np.empty(len(mesh.vertices) * 3, dtype=np.float64)
        mesh.vertices.foreach_get('co', co)
    finally:
        evaluated.to_mesh_clear()
    matrix = np.array(evaluated.matrix_world)
    return co.reshape(-1, 3) @ matrix[:3, :3].T + matrix[:3, 3]


def _surface(obj, depsgraph, warnings):
    """
    The evaluated mesh split into triangle corners, as the PS2 stores it. Returns the vertex index, world space normal,
    UV and colour of every corner.
    """
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        mesh.calc_loop_triangles()
        corners = np.empty(len(mesh.loop_triangles) * 3, dtype=np.int64)
        mesh.loop_triangles.foreach_get('loops', corners)
        if len(corners) == 0:
            raise ExportError(f"'{obj.name}' has no faces.")

        matrix = np.array(evaluated.matrix_world)[:3, :3]
        if np.linalg.det(matrix) < 0:
            # A negative scale mirrors the mesh, flip each triangle so it still faces outward.
            corners = corners.reshape(-1, 3)[:, ::-1].reshape(-1)

        loop_vertices = np.empty(len(mesh.loops), dtype=np.int64)
        mesh.loops.foreach_get('vertex_index', loop_vertices)

        normals = np.empty(len(mesh.loops) * 3, dtype=np.float64)
        mesh.corner_normals.foreach_get('vector', normals)
        normals = normals.reshape(-1, 3)[corners] @ np.linalg.inv(matrix)
        lengths = np.linalg.norm(normals, axis=1, keepdims=True)
        normals = np.divide(normals, lengths, out=np.zeros_like(normals), where=lengths > 0)

        if mesh.uv_layers.active:
            uvs = np.empty(len(mesh.loops) * 2, dtype=np.float64)
            mesh.uv_layers.active.data.foreach_get('uv', uvs)
            uvs = uvs.reshape(-1, 2)[corners]
        else:
            warnings.append(f"'{obj.name}' has no UV map, its texture won't show.")
            uvs = np.zeros((len(corners), 2))

        attribute = mesh.color_attributes.active_color
        if attribute is None and len(mesh.color_attributes):
            attribute = mesh.color_attributes[0]
        if attribute is not None and attribute.domain in ('CORNER', 'POINT'):
            values = np.empty(len(attribute.data) * 4, dtype=np.float64)
            # color_srgb gives the values as displayed, which is how the importer stores the PS2's 0-255 values.
            attribute.data.foreach_get('color_srgb', values)
            values = values.reshape(-1, 4)
            values = values[corners] if attribute.domain == 'CORNER' else values[loop_vertices[corners]]
            colors = [tuple(c) for c in np.clip(np.rint(values * 255), 0, 255).astype(int).tolist()]
        else:
            colors = [DEFAULT_COLOR] * len(corners)

        return loop_vertices[corners], normals, uvs, colors
    finally:
        evaluated.to_mesh_clear()


def _loop_range(scene, obj):
    """The first frame and length in frames of one animation loop."""
    key = obj.data.shape_keys
    action = key.animation_data.action if key and key.animation_data else None
    # The importer sets a cyclic frame range on the action, where the end frame looks the same as the start frame.
    if action and action.use_frame_range:
        return action.frame_start, action.frame_end - action.frame_start
    return scene.frame_start, scene.frame_end - scene.frame_start + 1


def _shape_key_animation(scene, obj, depsgraph, vertex_count, warnings):
    """Shapes and weight keys from the object's shape keys. Returns (shapes, keys, length in ticks)."""
    key = obj.data.shape_keys
    if not key.use_relative:
        raise ExportError(f"'{obj.name}' uses absolute shape keys, which the PS2 can't play. Use Bake animation instead.")
    blocks = list(key.key_blocks)
    if any(b.relative_key != blocks[0] for b in blocks[1:]):
        warnings.append(f"'{obj.name}' has shape keys relative to a key other than the basis, they are treated as "
                        f"relative to the basis.")

    # Each shape key at full strength, with any modifiers applied.
    shapes = []
    obj.show_only_shape_key = True
    for i in range(len(blocks)):
        obj.active_shape_key_index = i
        depsgraph.update()
        positions = _world_positions(obj, depsgraph)
        if len(positions) != vertex_count:
            raise ExportError(f"'{obj.name}' changes vertex count between shape keys.")
        shapes.append(positions)
    obj.show_only_shape_key = False

    # Sample every frame and every keyframe of one loop. Samples on straight lines between keys are removed later.
    start, length = _loop_range(scene, obj)
    end = start + length
    samples = {start + i for i in range(int(length) + 1)} | {end}
    samples |= {p.co.x for fc in fcurves.get_fcurves(key) for p in fc.keyframe_points if start <= p.co.x <= end}
    samples = sorted(samples)

    weights = [[] for _ in blocks]
    for frame in samples:
        _set_frame(scene, frame)
        evaluated_blocks = obj.evaluated_get(depsgraph).data.shape_keys.key_blocks
        values = [0.0 if b.mute else evaluated_blocks[i].value for i, b in enumerate(blocks) if i > 0]
        # Shape keys add to the basis, PS2 shapes are averaged by weight. Giving the basis the leftover weight makes
        # the weights sum to 1, where the two are the same.
        weights[0].append(1.0 - sum(values))
        for i, value in enumerate(values):
            weights[i + 1].append(value)

    ticks_per_frame = _ticks_per_frame(scene)
    kept, keys = anim.weight_tracks_to_frames([(f - start) * ticks_per_frame for f in samples], weights)
    return [shapes[i] for i in kept], keys, length * ticks_per_frame


def _baked_animation(scene, obj, depsgraph, vertex_count, step):
    """Shapes sampled every `step` frames of the scene's frame range, blending from one to the next."""
    start, length = scene.frame_start, scene.frame_end - scene.frame_start + 1
    shapes = []
    for frame in range(start, start + length, step):
        scene.frame_set(frame)
        positions = _world_positions(obj, depsgraph)
        if len(positions) != vertex_count:
            raise ExportError(f"'{obj.name}' changes vertex count during its animation (on frame {frame}), so it "
                              f"can't be baked. Apply or remove modifiers that add or remove geometry.")
        shapes.append(positions)
    step_ticks = step * _ticks_per_frame(scene)
    keys = [anim.loop_points(i, len(shapes), step_ticks) for i in range(len(shapes))]
    return shapes, keys, len(shapes) * step_ticks


def object_to_icon(context, obj, animation, bake_step, warnings) -> Icon:
    scene = context.scene
    has_shape_keys = obj.data.shape_keys is not None and len(obj.data.shape_keys.key_blocks) > 1
    if animation != 'BAKE' and any(m.type == 'ARMATURE' for m in obj.modifiers):
        warnings.append(f"'{obj.name}' is deformed by an armature, choose Bake animation to export that movement.")
    with _preserved_state(scene, obj):
        if animation == 'SHAPE_KEYS' and has_shape_keys:
            _set_frame(scene, _loop_range(scene, obj)[0])
        elif animation == 'BAKE':
            scene.frame_set(scene.frame_start)
        depsgraph = context.evaluated_depsgraph_get()
        corner_vertices, normals, uvs, colors = _surface(obj, depsgraph, warnings)
        vertex_count = len(_world_positions(obj, depsgraph))

        if animation == 'SHAPE_KEYS' and has_shape_keys:
            shapes, keys, length = _shape_key_animation(scene, obj, depsgraph, vertex_count, warnings)
        elif animation == 'BAKE':
            shapes, keys, length = _baked_animation(scene, obj, depsgraph, vertex_count, bake_step)
        else:
            shapes, keys, length = [_world_positions(obj, depsgraph)], [], 0

    # A single shape at a constant full weight doesn't move.
    if len(shapes) <= 1 and all(abs(v - 1) < anim.EPSILON for k in keys for _, v in k):
        shapes, keys = shapes[:1], []
    if not keys:
        frames, frame_length = [Frame(0, [Key(0.0, 1.0)])], 1
    else:
        frames = [Frame(i, [Key(float(t), float(v)) for t, v in k]) for i, k in enumerate(keys)]
        frame_length = max(1, round(length))

    def to_ps2(points):
        # Blender (x, y, z) to PS2 icon space (x, -z, y), see formats/coords.py.
        return [tuple(p) for p in np.stack([points[:, 0], -points[:, 2], points[:, 1]], axis=1).tolist()]

    return Icon(
        shapes=[to_ps2(shape[corner_vertices]) for shape in shapes],
        normals=to_ps2(normals),
        uvs=[tuple(uv) for uv in uvs.tolist()],
        colors=colors,
        frames=frames,
        frame_length=frame_length,
        texture=_texture(obj, warnings),
    )


def _find_image(obj):
    for slot in obj.material_slots:
        material = slot.material
        if material and material.node_tree:
            for node in material.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image:
                    return node.image
    return None


def _texture(obj, warnings):
    image = _find_image(obj)
    if image is None:
        warnings.append(f"'{obj.name}' has no image texture in its material, it will be plain white.")
        return None
    width, height = image.size
    if width == 0 or height == 0:
        raise ExportError(f"The texture '{image.name}' couldn't be loaded.")

    # The PS2 needs exactly 128x128. Textures already that size (like PS2IODB's) are used as they are.
    scaled = None
    if (width, height) != (TEXTURE_WIDTH, TEXTURE_HEIGHT):
        scaled = image.copy()
        scaled.scale(TEXTURE_WIDTH, TEXTURE_HEIGHT)
        warnings.append(f"The texture '{image.name}' was resized from {width}x{height} to "
                        f"{TEXTURE_WIDTH}x{TEXTURE_HEIGHT}, the only size the PS2 supports.")
    try:
        pixels = np.empty(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4, dtype=np.float32)
        (scaled or image).pixels.foreach_get(pixels)
    finally:
        if scaled:
            bpy.data.images.remove(scaled)
    return rgba_to_texture(np.clip(np.rint(pixels * 255), 0, 255).astype(int).tolist(), TEXTURE_WIDTH, TEXTURE_HEIGHT)


def build_card(context, animation='SHAPE_KEYS', bake_step=5, fullwidth_title=True):
    """Build the memory card image for the scene's icon settings. Returns (card bytes, warnings)."""
    settings = context.scene.ps2iodb
    warnings = []

    normal = settings.normal_object
    if normal is None:
        active = context.active_object
        if active is None or active.type != 'MESH':
            raise ExportError("Choose the icon's mesh in the PS2 Icon panel (View3D sidebar), or select a mesh object.")
        normal = active

    # One icon file per distinct object.
    filenames = {}
    states = []
    for obj, filename in ((normal, 'icon.ico'), (settings.copy_object or normal, 'copy.ico'),
                          (settings.delete_object or normal, 'del.ico')):
        states.append(filenames.setdefault(obj.name, (obj, filename))[1])

    files = []
    for obj, filename in filenames.values():
        icon = object_to_icon(context, obj, animation, bake_step, warnings)
        files.append((filename, write_icon(icon)))

    icon_sys = IconSys(
        title_line1=settings.title_line1,
        title_line2=settings.title_line2,
        normal=states[0], copy=states[1], delete=states[2],
        bg_opacity=settings.bg_opacity,
        bg_colors=[tuple(c * 255 for c in color) for color in (settings.bg_top_left, settings.bg_top_right,
                                                               settings.bg_bottom_left, settings.bg_bottom_right)],
        light_dirs=[tuple(settings.light1_direction), tuple(settings.light2_direction), tuple(settings.light3_direction)],
        light_colors=[tuple(settings.light1_color), tuple(settings.light2_color), tuple(settings.light3_color)],
        ambient=tuple(settings.ambient_color),
    )
    files.insert(0, ('icon.sys', write_icon_sys(icon_sys, fullwidth_title)))
    return memcard.create_card({settings.directory: files}), warnings


class EXPORT_SCENE_OT_ps2iodb_memory_card(bpy.types.Operator, ExportHelper):
    """Export the icon set up in the PS2 Icon panel to a new PS2 memory card image, for PCSX2 or an SD card based memory card"""
    bl_idname = 'export_scene.ps2iodb_memory_card'
    bl_label = "Export PS2 Memory Card"
    bl_options = {'PRESET'}

    filename_ext = '.ps2'
    filter_glob: StringProperty(default='*.ps2', options={'HIDDEN'})

    animation: EnumProperty(
        name="Animation",
        description="Where the icon's animation comes from",
        items=(
            ('SHAPE_KEYS', "Shape Keys", "Each shape key becomes a PS2 shape, blended by its animated value. "
                                         "Icons imported from PS2IODB use this"),
            ('BAKE', "Bake", "Sample the deformed mesh every few frames of the scene's frame range, for animation "
                             "made with armatures, modifiers or anything else. Each sample is stored in full, "
                             "so use as few as you can"),
            ('NONE', "None", "Export the mesh as it looks on the current frame, without animation"),
        ),
        default='SHAPE_KEYS',
    )
    bake_step: IntProperty(
        name="Bake Step",
        description="Frames between baked samples. The PS2 blends smoothly between them",
        default=5, min=1,
    )
    fullwidth_title: BoolProperty(
        name="Full-Width Title",
        description="Convert ASCII in the title to full-width characters, as PS2 games do",
        default=True,
    )

    def invoke(self, context, event):
        if not self.filepath:
            self.filepath = context.scene.ps2iodb.directory + self.filename_ext
        return super().invoke(context, event)

    def draw(self, context):
        layout = self.layout
        layout.use_property_split = True
        layout.prop(self, 'animation')
        row = layout.row()
        row.enabled = self.animation == 'BAKE'
        row.prop(self, 'bake_step')
        layout.prop(self, 'fullwidth_title')

    def execute(self, context):
        try:
            card, warnings = build_card(context, self.animation, self.bake_step, self.fullwidth_title)
        except (ExportError, IconError, IconSysError, memcard.MemcardError) as e:
            self.report({'ERROR'}, str(e))
            return {'CANCELLED'}
        with open(self.filepath, 'wb') as f:
            f.write(card)
        for warning in warnings:
            self.report({'WARNING'}, warning)
        self.report({'INFO'}, f"Exported memory card to {self.filepath}")
        return {'FINISHED'}


classes = (EXPORT_SCENE_OT_ps2iodb_memory_card,)
