"""
F-Curve access that works on both sides of Blender 4.4's slotted actions change.
Before 4.4 an action's F-Curves are `action.fcurves`. From 4.4 they live in a channelbag per action slot, and
`action.fcurves` was removed in 5.0.
"""


def ensure_fcurve(action, id_data, data_path):
    """Get or create the F-Curve animating `data_path` on `id_data`. The action must already be assigned to `id_data`."""
    if hasattr(action, 'fcurve_ensure_for_datablock'):
        return action.fcurve_ensure_for_datablock(id_data, data_path)
    return action.fcurves.find(data_path) or action.fcurves.new(data_path)


def get_fcurves(id_data):
    """All F-Curves animating `id_data`, or an empty list."""
    animation_data = id_data.animation_data
    if not animation_data or not animation_data.action:
        return []
    action = animation_data.action
    slot = getattr(animation_data, 'action_slot', None)
    if slot is not None:
        from bpy_extras import anim_utils
        channelbag = anim_utils.action_get_channelbag_for_slot(action, slot)
        return list(channelbag.fcurves) if channelbag else []
    if hasattr(action, 'fcurves'):
        return list(action.fcurves)
    return []
