"""The PS2 Icon tab in the 3D Viewport's sidebar, and the File > Import / Export menu entries."""

import bpy

from .export_card import EXPORT_SCENE_OT_ps2iodb_memory_card
from .import_icon import IMPORT_SCENE_OT_ps2iodb_icon


class _Panel:
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "PS2 Icon"


class VIEW3D_PT_ps2iodb(_Panel, bpy.types.Panel):
    bl_label = "PS2 Icon"

    def draw(self, context):
        column = self.layout.column(align=True)
        column.operator(IMPORT_SCENE_OT_ps2iodb_icon.bl_idname, text="Import PS2IODB Icon", icon='IMPORT')
        column.operator(EXPORT_SCENE_OT_ps2iodb_memory_card.bl_idname, text="Export Memory Card", icon='EXPORT')


class VIEW3D_PT_ps2iodb_save(_Panel, bpy.types.Panel):
    bl_label = "Save"
    bl_parent_id = 'VIEW3D_PT_ps2iodb'

    def draw(self, context):
        settings = context.scene.ps2iodb
        layout = self.layout
        layout.use_property_split = True
        layout.use_property_decorate = False
        layout.prop(settings, 'title_line1')
        layout.prop(settings, 'title_line2')
        layout.prop(settings, 'directory')

        layout.separator()
        column = layout.column(heading="Meshes")
        column.prop(settings, 'normal_object')
        column.prop(settings, 'copy_object')
        column.prop(settings, 'delete_object')


class VIEW3D_PT_ps2iodb_background(_Panel, bpy.types.Panel):
    bl_label = "Background"
    bl_parent_id = 'VIEW3D_PT_ps2iodb'
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        settings = context.scene.ps2iodb
        layout = self.layout
        layout.use_property_split = True
        layout.use_property_decorate = False
        layout.prop(settings, 'bg_opacity')
        layout.prop(settings, 'bg_top_left')
        layout.prop(settings, 'bg_top_right')
        layout.prop(settings, 'bg_bottom_left')
        layout.prop(settings, 'bg_bottom_right')


class VIEW3D_PT_ps2iodb_lighting(_Panel, bpy.types.Panel):
    bl_label = "Lighting"
    bl_parent_id = 'VIEW3D_PT_ps2iodb'
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        settings = context.scene.ps2iodb
        layout = self.layout
        layout.use_property_split = True
        layout.use_property_decorate = False
        for i in (1, 2, 3):
            column = layout.column(align=True)
            column.prop(settings, f'light{i}_color')
            column.prop(settings, f'light{i}_direction', text="Direction")
        layout.prop(settings, 'ambient_color')


def menu_import(self, context):
    self.layout.operator(IMPORT_SCENE_OT_ps2iodb_icon.bl_idname, text="PS2IODB Icon (.zip/.obj)")


def menu_export(self, context):
    self.layout.operator(EXPORT_SCENE_OT_ps2iodb_memory_card.bl_idname, text="PS2 Memory Card (.ps2)")


classes = (VIEW3D_PT_ps2iodb, VIEW3D_PT_ps2iodb_save, VIEW3D_PT_ps2iodb_background, VIEW3D_PT_ps2iodb_lighting)
