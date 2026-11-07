"""
End to end test of the add-on inside Blender, using real icons from website/public/icons.
Not run by CI, which doesn't have Blender. Run it from the repository root with:
    blender --background --factory-startup --python blender/tests/blender_smoke.py

Optionally pass a path after `--` to also save the exported memory card there, e.g. to check it with another tool:
    blender --background --factory-startup --python blender/tests/blender_smoke.py -- out.ps2
"""

import json
import os
import sys
import traceback

import bpy
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ICONS = os.path.join(REPO, 'website', 'public', 'icons')
sys.path.insert(0, os.path.join(REPO, 'blender'))

import ps2iodb  # noqa: E402
from ps2iodb import export_card, import_icon  # noqa: E402
from ps2iodb.formats import anim, coords, icon, memcard  # noqa: E402

failures = []


def check(condition, message):
    if not condition:
        failures.append(message)
        print(f"FAIL: {message}")


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def website_positions(anim_json, tick):
    """Vertex positions in PS2 icon space at `tick`, as the website's animateV1 or animateV2 computes them."""
    frames = anim_json['frames']
    shapes = np.array([f['vertexData'] for f in frames]).reshape(len(frames), -1, 3)
    if anim_json.get('version') is None:
        # Each frame shown for 9 ticks (0.15 seconds), blending into the next.
        index, blend = int(tick // 9) % len(frames), (tick % 9) / 9
        return shapes[index] * (1 - blend) + shapes[(index + 1) % len(frames)] * blend
    weights = np.array([anim.evaluate([(k['time'], k['value']) for k in f['keys']], tick) for f in frames], dtype=float)
    weights /= weights.sum()
    return np.tensordot(weights, shapes, axes=1)


def exported_positions(parsed, tick):
    weights = np.array([anim.evaluate([(k.time, k.value) for k in f.keys], tick) for f in parsed.frames], dtype=float)
    weights /= weights.sum()
    shapes = np.array(parsed.shapes)[[f.shape_id for f in parsed.frames]]
    return np.tensordot(weights, shapes, axes=1)


def blender_positions(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = obj.evaluated_get(depsgraph).to_mesh()
    co = np.empty(len(mesh.vertices) * 3)
    mesh.vertices.foreach_get('co', co)
    obj.evaluated_get(depsgraph).to_mesh_clear()
    return co.reshape(-1, 3)


def test_animated_icon(card_path=None):
    """Import Devil May Cry 3 (3 states, V2 animation), check playback matches the website, export and check again."""
    reset()
    folder = os.path.join(ICONS, 'devilmaycry3')
    objects, warnings = import_icon.import_icon(bpy.context, os.path.join(folder, 'iconsys.json'), merge_vertices=False)
    check(len(objects) == 3, f"devilmaycry3 imports 3 objects, got {len(objects)}")
    check(not warnings, f"no import warnings, got {warnings}")

    scene = bpy.context.scene
    settings = scene.ps2iodb
    normal = settings.normal_object
    with open(os.path.join(folder, 'icon00.ico.anim'), encoding='utf-8') as f:
        anim_json = json.load(f)
    check(len(normal.data.shape_keys.key_blocks) == len(anim_json['frames']) + 1, "one shape key per frame plus basis")
    check(scene.render.fps == 60, "scene set to 60 fps")
    check(scene.frame_end - scene.frame_start + 1 == anim_json['frameLength'], "frame range is one loop")
    check(settings.title_line1 == 'DEVIL MAY CRY 3', f"title converted to half-width, got {settings.title_line1!r}")
    check(settings.copy_object.hide_get() and not normal.hide_get(), "copy state hidden, normal visible")

    # Every state has its own loop length (the delete state loops every 60 frames, the others every 80), the preview
    # switch sets the timeline to it. Check every frame of the loop and the one after, which must wrap to the start.
    for state, filename in (('NORMAL', 'icon00'), ('COPY', 'icon01'), ('DELETE', 'icon02')):
        settings.preview_state = state
        obj = {'NORMAL': normal, 'COPY': settings.copy_object, 'DELETE': settings.delete_object}[state]
        with open(os.path.join(folder, f'{filename}.ico.anim'), encoding='utf-8') as f:
            state_anim = json.load(f)
        length = state_anim['frameLength']
        check(scene.frame_end - scene.frame_start + 1 == length, f"{state} preview sets the frame range to its loop")
        check(not obj.hide_get() and all(o.hide_get() for o in objects if o != obj), f"{state} preview shows only it")
        errors = []
        for tick in range(length + 1):
            scene.frame_set(scene.frame_start + tick)
            expected = np.array([coords.ps2_to_blender(p) for p in website_positions(state_anim, tick % length)])
            errors.append(np.abs(blender_positions(obj) - expected).max())
        worst = int(np.argmax(errors))
        check(errors[worst] < 1e-4, f"{state} playback matches website on every frame, worst tick {worst} off by {errors[worst]}")
    settings.preview_state = 'NORMAL'

    card, warnings = export_card.build_card(bpy.context)
    check(not warnings, f"no export warnings, got {warnings}")
    if card_path:
        with open(card_path, 'wb') as f:
            f.write(card)
    saves = memcard.read_card(card)
    check(list(saves) == ['PS2IODB-DEVILMAYCRY3'], f"save folder name, got {list(saves)}")
    files = saves[list(saves)[0]]
    check(sorted(files) == ['copy.ico', 'del.ico', 'icon.ico', 'icon.sys'], f"save files, got {sorted(files)}")
    check(files['icon.sys'][260:268] == b'icon.ico' and files['icon.sys'][388:395] == b'del.ico', "icon.sys filenames")

    parsed = icon.read_icon(files['icon.ico'])
    for tick in (0, 13, 48, 60, 79):
        error = np.abs(exported_positions(parsed, tick) - website_positions(anim_json, tick)).max()
        # Positions are stored to 1/4096.
        check(error < 1 / 4096 + 1e-6, f"exported icon playback matches website at tick {tick}, max error {error}")
    check(parsed.frame_length == anim_json['frameLength'], f"frame length {parsed.frame_length}")

    obj_colors = [tuple(round(c * 255) for c in v[3:7]) for v in _obj_vertices(os.path.join(folder, 'icon00.ico.obj'))]
    check(parsed.colors == obj_colors, "vertex colours round trip")

    # The default import merges vertices, which reorders them but must still export the same triangles.
    reset()
    import_icon.import_icon(bpy.context, os.path.join(folder, 'iconsys.json'))
    card, _ = export_card.build_card(bpy.context)
    merged = icon.read_icon(memcard.read_card(card)['PS2IODB-DEVILMAYCRY3']['icon.ico'])
    check(merged.vertex_count == parsed.vertex_count, f"merged import keeps every triangle, {merged.vertex_count} vertices")
    exported, expected = exported_positions(merged, 48), website_positions(anim_json, 48)
    nearest = np.sqrt(((exported[:, None, :] - expected[None, :, :]) ** 2).sum(axis=2)).min(axis=1).max()
    check(nearest < 1e-3, f"merged import exports the same positions, max distance {nearest}")

    image = bpy.data.images.load(os.path.join(folder, 'icon00.ico.png'))
    pixels = np.empty(128 * 128 * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    expected_texture = icon.rgba_to_texture(np.rint(pixels * 255).astype(int).tolist(), 128, 128)
    check(parsed.texture == expected_texture, "texture round trips")


def _obj_vertices(path):
    with open(path, encoding='utf-8') as f:
        return [[float(x) for x in line.replace('#', ' ').split()[1:]] for line in f if line.startswith('v ')]


def test_playback_matches_website():
    """
    Icons that have each needed a fix to play back like the website, checked on every whole tick of every state:
    120ennoharu (V1), nba06 (negative weights), ininja (animSpeed 0.5), redfaction2 (null light directions),
    cartfurychampionshipracing (garbage background opacity).
    """
    for code in ('120ennoharu', 'nba06', 'ininja', 'redfaction2', 'cartfurychampionshipracing'):
        reset()
        folder = os.path.join(ICONS, code)
        import_icon.import_icon(bpy.context, os.path.join(folder, 'iconsys.json'), merge_vertices=False)
        scene = bpy.context.scene
        settings = scene.ps2iodb
        with open(os.path.join(folder, 'iconsys.json'), encoding='utf-8') as f:
            iconsys = json.load(f)
        for state in ('normal', 'copy', 'delete'):
            path = os.path.join(folder, iconsys[state] + '.anim')
            obj = getattr(settings, f'{state}_object') or settings.normal_object
            if not os.path.exists(path) or obj.data.shape_keys is None:
                continue
            with open(path, encoding='utf-8') as f:
                state_anim = json.load(f)
            settings.preview_state = state.upper()
            v1 = state_anim.get('version') is None
            speed = 1 if v1 else state_anim['animSpeed']
            length = 9 * len(state_anim['frames']) if v1 else state_anim['frameLength']
            worst = (0, 0)
            for tick in range(int(length) + 1):
                frame = scene.frame_start + tick / speed
                if frame != int(frame):
                    continue  # The website only shows whole ticks.
                scene.frame_set(int(frame))
                expected = np.array([coords.ps2_to_blender(p) for p in website_positions(state_anim, tick % length)])
                worst = max(worst, (np.abs(blender_positions(obj) - expected).max(), tick))
            check(worst[0] < 1e-4, f"{code} {state} playback matches website, worst tick {worst[1]} off by {worst[0]}")


def test_zip_import():
    reset()
    path = os.path.join(ICONS, 'devilmaycry3', 'icon.zip')
    if not os.path.exists(path):
        print("SKIP: devilmaycry3/icon.zip not found, run `npm run create-zips` in website/ to test zip imports.")
        return
    objects, _ = import_icon.import_icon(bpy.context, path)
    check(len(objects) == 3, "zip import makes 3 objects")
    images = [i for i in bpy.data.images if i.packed_file]
    check(len(images) == 1, "zip texture packed into the .blend")


def test_v1_and_static_icons():
    reset()
    objects, _ = import_icon.import_icon(bpy.context, os.path.join(ICONS, '120ennoharu', 'iconsys.json'))
    check(objects[0].data.shape_keys is not None, "V1 animation imports as shape keys")
    card, _ = export_card.build_card(bpy.context)
    parsed = icon.read_icon(list(memcard.read_card(card).values())[0]['icon.ico'])
    check(len(parsed.shapes) > 1, "V1 animation exports shapes")

    reset()
    objects, _ = import_icon.import_icon(bpy.context, os.path.join(ICONS, '007everythingornothing', 'iconsys.json'))
    check(objects[0].data.shape_keys is None, "static icon has no shape keys")
    card, _ = export_card.build_card(bpy.context)
    parsed = icon.read_icon(list(memcard.read_card(card).values())[0]['icon.ico'])
    check(len(parsed.shapes) == 1 and len(parsed.frames) == 1, "static icon exports one shape and frame")


def test_bake():
    """A modifier animated over 20 frames, baked every 5 frames, gives 4 shapes."""
    reset()
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, 20
    mesh = bpy.data.meshes.new('cube')
    mesh.from_pydata([(x, y, z) for x in (-1, 1) for y in (-1, 1) for z in (0, 2)], [],
                     [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)])
    obj = bpy.data.objects.new('cube', mesh)
    scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new('twist', 'SIMPLE_DEFORM')
    modifier.angle = 0
    modifier.keyframe_insert('angle', frame=1)
    modifier.angle = 1.5
    modifier.keyframe_insert('angle', frame=20)

    card, warnings = export_card.build_card(bpy.context, animation='BAKE', bake_step=5)
    check(any('no UV map' in w for w in warnings), "warns about missing UVs")
    parsed = icon.read_icon(list(memcard.read_card(card).values())[0]['icon.ico'])
    check(len(parsed.shapes) == 4, f"baked 4 shapes, got {len(parsed.shapes)}")
    check(parsed.vertex_count == 36, f"cube is 12 triangles, got {parsed.vertex_count // 3}")
    check(parsed.shapes[0] != parsed.shapes[3], "baked shapes differ")
    check(scene.frame_current == 1, "current frame restored")

    card, _ = export_card.build_card(bpy.context, animation='NONE')
    parsed = icon.read_icon(list(memcard.read_card(card).values())[0]['icon.ico'])
    check(len(parsed.shapes) == 1, "no animation exports one shape")


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    reset()
    ps2iodb.register()
    try:
        for test in (lambda: test_animated_icon(argv[0] if argv else None), test_playback_matches_website,
                     test_zip_import, test_v1_and_static_icons,
                     test_bake):
            try:
                test()
            except Exception:
                failures.append(traceback.format_exc())
                traceback.print_exc()
    finally:
        ps2iodb.unregister()
    print(f"\n{len(failures)} failure(s)" if failures else "\nAll Blender tests passed")
    sys.exit(1 if failures else 0)


main()
