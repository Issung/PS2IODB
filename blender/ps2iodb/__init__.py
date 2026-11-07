"""
PS2IODB Icon Tools: import PS2 save icons downloaded from https://ps2iodb.com into Blender, with their animation, and
export icons made in Blender to a PS2 memory card image.
"""

import bpy

from . import export_card, import_icon, properties, ui

_classes = import_icon.classes + export_card.classes + ui.classes


def register():
    properties.register()
    for cls in _classes:
        bpy.utils.register_class(cls)
    bpy.types.TOPBAR_MT_file_import.append(ui.menu_import)
    bpy.types.TOPBAR_MT_file_export.append(ui.menu_export)


def unregister():
    bpy.types.TOPBAR_MT_file_export.remove(ui.menu_export)
    bpy.types.TOPBAR_MT_file_import.remove(ui.menu_import)
    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)
    properties.unregister()
