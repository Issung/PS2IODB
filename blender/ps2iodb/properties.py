"""
The icon's save settings, stored on the scene as `scene.ps2iodb`. These become the save's `icon.sys` on export, and the
importer fills them in from the downloaded `iconsys.json`.
"""

import bpy
from bpy.props import EnumProperty, FloatVectorProperty, IntProperty, PointerProperty, StringProperty


def _is_mesh(self, obj):
    return obj.type == 'MESH'


def show_state(scene, state, set_frame_range=True):
    """
    Show only the mesh of one state ('NORMAL', 'COPY' or 'DELETE') and set the scene's frame range to one loop of its
    animation. States can loop at different lengths (Devil May Cry 3's delete state loops every 60 frames, its normal
    state every 80), so with the wrong range Blender would cut the loop short or restart it partway through.
    """
    settings = scene.ps2iodb
    normal = settings.normal_object
    objects = {'NORMAL': normal, 'COPY': settings.copy_object or normal, 'DELETE': settings.delete_object or normal}
    shown = objects[state]
    for obj in {o for o in objects.values() if o}:
        try:
            obj.hide_set(obj != shown)
        except RuntimeError:
            pass  # Not in the current view layer.

    key = shown.data.shape_keys if shown else None
    action = key.animation_data.action if key and key.animation_data else None
    if set_frame_range and action and action.use_frame_range:
        # The action's range is one loop with the end frame looking like the start, the scene's range is inclusive.
        scene.frame_start = round(action.frame_start)
        scene.frame_end = scene.frame_start + max(1, round(action.frame_end - action.frame_start)) - 1


def _preview_state_changed(self, context):
    show_state(context.scene, self.preview_state)


def _color(name, default, description):
    # COLOR_GAMMA so the values shown are the raw values written to icon.sys, not converted to linear.
    # Some games use values well above 1 (Aliens in the Attic's ambient light is 255), so only the soft range is limited.
    return FloatVectorProperty(name=name, description=description, subtype='COLOR_GAMMA', size=3,
                               default=default, soft_min=0.0, soft_max=1.0, min=-1024.0, max=1024.0)


def _direction(name, default):
    return FloatVectorProperty(name=name, description="Light direction, in PS2 icon space as stored in icon.sys",
                               size=3, default=default, soft_min=-1.0, soft_max=1.0)


class PS2IODB_SaveSettings(bpy.types.PropertyGroup):
    title_line1: StringProperty(
        name="Title",
        description="First line of the save's title in the PS2 browser. ASCII is converted to full-width characters "
                    "on export, as PS2 games do. Both lines together can be at most 33 full-width characters",
        default="PS2IODB Icon",
    )
    title_line2: StringProperty(
        name="Line 2",
        description="Second line of the save's title in the PS2 browser",
        default="",
    )
    directory: StringProperty(
        name="Save Folder",
        description="Name of the save's folder on the memory card. Avoid a real game's save folder name (like "
                    "BASLUS-12345...) or that game may try to load it",
        default="PS2IODB-ICON",
        maxlen=31,
    )

    normal_object: PointerProperty(
        name="Normal",
        description="Mesh shown while the save is idle in the PS2 browser. Uses the active object if empty",
        type=bpy.types.Object, poll=_is_mesh,
    )
    copy_object: PointerProperty(
        name="Copy",
        description="Mesh shown while the save is being copied. Uses the normal mesh if empty",
        type=bpy.types.Object, poll=_is_mesh,
    )
    delete_object: PointerProperty(
        name="Delete",
        description="Mesh shown while the save is being deleted. Uses the normal mesh if empty",
        type=bpy.types.Object, poll=_is_mesh,
    )

    preview_state: EnumProperty(
        name="Preview",
        description="Show this state's mesh and set the timeline to one loop of its animation, like pressing 1, 2 or 3 "
                    "on the website",
        items=(
            ('NORMAL', "Normal", "The state shown while the save is idle"),
            ('COPY', "Copy", "The state shown while the save is being copied"),
            ('DELETE', "Delete", "The state shown while the save is being deleted"),
        ),
        default='NORMAL',
        update=_preview_state_changed,
    )

    bg_opacity: IntProperty(
        name="Opacity",
        description="Opacity of the background gradient behind the icon. Most games use 96, 128 is fully opaque",
        default=96, min=0, max=255, soft_max=128,
    )
    bg_top_left: _color("Top Left", (0.1, 0.1, 0.3), "Background colour in the top left corner")
    bg_top_right: _color("Top Right", (0.1, 0.1, 0.3), "Background colour in the top right corner")
    bg_bottom_left: _color("Bottom Left", (0.0, 0.0, 0.0), "Background colour in the bottom left corner")
    bg_bottom_right: _color("Bottom Right", (0.0, 0.0, 0.0), "Background colour in the bottom right corner")

    # Defaults are Devil May Cry 3's lighting, a typical set up of a warm key light and two cooler fill lights.
    light1_direction: _direction("Light 1 Direction", (0.46, 0.35, 0.82))
    light1_color: _color("Light 1 Colour", (0.5, 0.45, 0.4), "Colour of the first directional light")
    light2_direction: _direction("Light 2 Direction", (-0.35, 0.68, -0.64))
    light2_color: _color("Light 2 Colour", (0.4, 0.4, 0.45), "Colour of the second directional light")
    light3_direction: _direction("Light 3 Direction", (0.5, -0.72, 0.47))
    light3_color: _color("Light 3 Colour", (0.35, 0.3, 0.3), "Colour of the third directional light")
    ambient_color: _color("Ambient", (0.3, 0.3, 0.3), "Colour of the ambient light")


classes = (PS2IODB_SaveSettings,)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.ps2iodb = PointerProperty(type=PS2IODB_SaveSettings)


def unregister():
    del bpy.types.Scene.ps2iodb
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
