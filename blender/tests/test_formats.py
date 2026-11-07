"""
Tests for the add-on's file formats. They don't need Blender, run them from the repository root with:
    python -m unittest discover blender/tests
"""

import os
import struct
import sys
import unittest
from datetime import datetime

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Import the formats package directly, the add-on's own __init__ needs Blender.
sys.path.insert(0, os.path.join(REPO, 'blender', 'ps2iodb'))

from formats import anim, coords, icon, iconsys, memcard  # noqa: E402
from formats.obj import parse_mtl_texture, parse_obj  # noqa: E402

SAMPLE_CARD = os.path.join(REPO, 'Documentation', 'Empty Memory Card.ps2')


class MemcardTests(unittest.TestCase):
    def test_blank_card_matches_pcsx2(self):
        """A card with no saves is byte for byte the same as one formatted by PCSX2, given the same timestamp."""
        with open(SAMPLE_CARD, 'rb') as f:
            sample = f.read()
        card = memcard.create_card({}, datetime(2018, 4, 22, 5, 20, 15, tzinfo=memcard.JST))
        self.assertEqual(len(card), len(sample))
        self.assertTrue(card == sample)

    def test_saves_read_back(self):
        files = [('icon.sys', b'a' * 964), ('icon.ico', bytes(range(256)) * 200), ('copy.ico', b'\x01')]
        card = memcard.create_card({'PS2IODB-TEST': files, 'SECOND': [('x', b'y' * 3000)]})
        saves = memcard.read_card(card)
        self.assertEqual(saves, {'PS2IODB-TEST': dict(files), 'SECOND': {'x': b'y' * 3000}})

    def test_ecc_is_valid(self):
        card = memcard.create_card({'PS2IODB-TEST': [('icon.ico', bytes(range(256)) * 40)]})
        erased = range(memcard.BACKUP_BLOCK_2 * 16, memcard.BACKUP_BLOCK_2 * 16 + 16)
        for page in range(len(card) // memcard.RAW_PAGE_SIZE):
            if page in erased:
                continue
            start = page * memcard.RAW_PAGE_SIZE
            content = card[start:start + memcard.PAGE_SIZE]
            spare = card[start + memcard.PAGE_SIZE:start + memcard.RAW_PAGE_SIZE]
            expected = b''.join(memcard.ecc_chunk(content[i:i + 128]) for i in range(0, 512, 128)) + bytes(4)
            self.assertEqual(spare, expected, f"page {page}")

    def test_invalid_names(self):
        for name in ('', 'a' * 32, 'has space', 'a/b', '..'):
            with self.assertRaises(memcard.MemcardError, msg=name):
                memcard.create_card({name: [('icon.sys', b'')]})

    def test_too_big(self):
        with self.assertRaises(memcard.MemcardError):
            memcard.create_card({'BIG': [('big', bytes(9 * 1024 * 1024))]})


class IconTests(unittest.TestCase):
    def make_icon(self):
        shapes = [[(0.5, -1.0, 0.25), (1.0, 0.0, -2.0), (-7.5, 3.0, 0.0)],
                  [(0.5, -1.5, 0.25), (1.0, 0.5, -2.0), (-7.5, 3.0, 1.0)]]
        return icon.Icon(
            shapes=shapes,
            normals=[(0.0, 1.0, 0.0), (1.0, 0.0, 0.0), (0.0, 0.0, -1.0)],
            uvs=[(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)],
            colors=[(255, 255, 255, 255), (128, 64, 0, 128), (1, 2, 3, 4)],
            frames=[icon.Frame(0, [icon.Key(0, 1), icon.Key(30, 0), icon.Key(60, 1)]),
                    icon.Frame(1, [icon.Key(0, 0), icon.Key(30, 1), icon.Key(60, 0)])],
            frame_length=60,
            texture=bytes(range(256)) * 128,
        )

    def test_round_trip(self):
        original = self.make_icon()
        data = icon.write_icon(original)
        # Header, vertices, animation header and frames, texture.
        self.assertEqual(len(data), 20 + 3 * (2 * 8 + 8 + 8) + 20 + 2 * (8 + 3 * 8) + icon.TEXTURE_BYTES)
        self.assertEqual(struct.unpack_from('<5I', data), (0x010000, 2, 0x07, 0x3F800000, 3))
        self.assertEqual(icon.read_icon(data), original)

    def test_white_texture_by_default(self):
        original = self.make_icon()
        original.texture = None
        self.assertEqual(icon.read_icon(icon.write_icon(original)).texture, b'\xff' * icon.TEXTURE_BYTES)

    def test_out_of_range(self):
        original = self.make_icon()
        original.shapes[0][0] = (8.5, 0, 0)
        with self.assertRaises(icon.IconError):
            icon.write_icon(original)

    def test_texture_conversion_round_trips_ps2iodb_pngs(self):
        """PS2IODB's PNGs store each 5-bit channel shifted left 3, converting back must give the same pixels."""
        pixels, expected = [], bytearray()
        for i in range(icon.TEXTURE_WIDTH * icon.TEXTURE_HEIGHT):
            r, g, b = i % 32, (i // 32) % 32, (i // 1024) % 32
            pixels += [r << 3, g << 3, b << 3, 255]
            expected += struct.pack('<H', r | g << 5 | b << 10 | 0x8000)
        self.assertEqual(icon.rgba_to_texture(pixels, 128, 128), bytes(expected))


class IconSysTests(unittest.TestCase):
    def test_layout(self):
        data = iconsys.write_icon_sys(iconsys.IconSys('Hello', 'World', normal='icon.ico', copy='copy.ico',
                                                      delete='del.ico', bg_colors=[(255, 0, 0)] * 4))
        self.assertEqual(len(data), iconsys.ICON_SYS_SIZE)
        self.assertEqual(data[:4], b'PS2D')
        # Full-width characters are 2 bytes each, so line 2 starts after 5 of them.
        self.assertEqual(struct.unpack_from('<H', data, 6)[0], 10)
        self.assertEqual(data[192:212].decode('cp932'), 'ＨｅｌｌｏＷｏｒｌｄ')
        self.assertEqual(data[260:268], b'icon.ico')
        self.assertEqual(data[324:332], b'copy.ico')
        self.assertEqual(data[388:395], b'del.ico')
        self.assertEqual(struct.unpack_from('<4I', data, 16), (255, 0, 0, 0))

    def test_half_width(self):
        data = iconsys.write_icon_sys(iconsys.IconSys('Hi there'), fullwidth_title=False)
        self.assertEqual(data[192:201], b'Hi there\0')

    def test_title_too_long(self):
        with self.assertRaises(iconsys.IconSysError):
            iconsys.write_icon_sys(iconsys.IconSys('x' * 20, 'y' * 20))


class AnimTests(unittest.TestCase):
    def assert_weights_sum_to_one(self, tracks, length):
        for tick in range(int(length) + 1):
            total = sum(anim.evaluate(t.points, tick) for t in tracks)
            self.assertAlmostEqual(total, 1.0, places=4, msg=f"tick {tick}")

    def test_normalised_tracks(self):
        """Weights that don't sum to 1 are divided by their sum, like the website does."""
        data = {'version': 3, 'frameLength': 40, 'animSpeed': 0.5, 'playOffset': 0, 'frames': [
            {'shapeId': 0, 'keys': [{'time': 0, 'value': 1}, {'time': 20, 'value': 0}, {'time': 40, 'value': 1}],
             'vertexData': [0, 0, 0]},
            {'shapeId': 1, 'keys': [{'time': 0, 'value': 0}, {'time': 20, 'value': 2}, {'time': 40, 'value': 0}],
             'vertexData': [1, 0, 0]},
        ]}
        tracks, length = anim.shape_tracks(data)
        # animSpeed 0.5 plays at half speed, doubling every time.
        self.assertEqual(length, 80)
        self.assert_weights_sum_to_one(tracks, length)
        # At tick 10 (20 after speed) shape 0 weighs 0.5 and shape 1 weighs 1, so shape 1 has 2/3 of the total.
        self.assertAlmostEqual(anim.evaluate(tracks[1].points, 20), 1 / 1.5 * 1, places=4)

    def test_shared_shapes_combine(self):
        data = {'version': 3, 'frameLength': 20, 'animSpeed': 1, 'playOffset': 0, 'frames': [
            {'shapeId': 0, 'keys': [{'time': 0, 'value': 1}, {'time': 10, 'value': 0}], 'vertexData': [0, 0, 0]},
            {'shapeId': 1, 'keys': [{'time': 0, 'value': 0}, {'time': 10, 'value': 1}, {'time': 20, 'value': 0}],
             'vertexData': [1, 0, 0]},
            {'shapeId': 0, 'keys': [{'time': 10, 'value': 0}, {'time': 20, 'value': 1}], 'vertexData': [0, 0, 0]},
        ]}
        tracks, length = anim.shape_tracks(data)
        self.assertEqual(len(tracks), 2)
        self.assert_weights_sum_to_one(tracks, length)

    def test_instant_jump_kept(self):
        data = {'version': 3, 'frameLength': 120, 'animSpeed': 1, 'playOffset': 0, 'frames': [
            {'shapeId': 0, 'keys': [{'time': 0, 'value': 1}, {'time': 60, 'value': 1}, {'time': 60, 'value': 0},
                                    {'time': 120, 'value': 0}], 'vertexData': [0, 0, 0]},
            {'shapeId': 1, 'keys': [{'time': 0, 'value': 0}, {'time': 60, 'value': 0}, {'time': 60, 'value': 1},
                                    {'time': 120, 'value': 1}], 'vertexData': [1, 0, 0]},
        ]}
        tracks, _ = anim.shape_tracks(data)
        self.assertAlmostEqual(anim.evaluate(tracks[0].points, 59.9), 1.0, places=3)
        self.assertAlmostEqual(anim.evaluate(tracks[0].points, 60), 0.0, places=3)

    def test_loop_end_shows_start(self):
        """The website never shows tick == frameLength, it wraps to 0. Icons that end on a different pose jump back."""
        data = {'version': 2, 'frameLength': 60, 'animSpeed': 1, 'playOffset': 0, 'frames': [
            {'keys': [{'time': 0, 'value': 0}, {'time': 60, 'value': 1}], 'vertexData': [0, 0, 0]},
            {'keys': [{'time': 0, 'value': 1}, {'time': 60, 'value': 0}], 'vertexData': [1, 0, 0]},
        ]}
        tracks, length = anim.shape_tracks(data)
        self.assertEqual(length, 60)
        self.assertAlmostEqual(anim.evaluate(tracks[0].points, 59), 59 / 60, places=4)
        self.assertEqual(anim.evaluate(tracks[0].points, 60), 0.0)
        self.assertEqual(anim.evaluate(tracks[1].points, 60), 1.0)
        self.assert_weights_sum_to_one(tracks, length)

    def test_v1(self):
        data = {'frameLength': 0, 'animSpeed': 1, 'playOffset': 0, 'frames': [
            {'keys': [], 'vertexData': [i, 0, 0]} for i in range(4)]}
        tracks, length = anim.shape_tracks(data)
        self.assertEqual(length, 4 * anim.V1_TICKS_PER_FRAME)
        self.assert_weights_sum_to_one(tracks, length)
        self.assertEqual(anim.evaluate(tracks[2].points, 2 * anim.V1_TICKS_PER_FRAME), 1.0)
        # Every track spans the whole loop, as Blender's Cycles modifier repeats a curve over its own keys.
        for track in tracks:
            self.assertEqual((track.points[0][0], track.points[-1][0]), (0, length))

    def test_static_animation_dropped(self):
        data = {'version': 3, 'frameLength': 20, 'animSpeed': 1, 'playOffset': 0, 'frames': [
            {'shapeId': i, 'keys': [{'time': 0, 'value': 1}], 'vertexData': [1, 2, 3]} for i in range(3)]}
        self.assertEqual(anim.shape_tracks(data), ([], 0))

    def test_weight_tracks_to_frames_drops_unused_and_simplifies(self):
        samples = [0, 1, 2, 3, 4]
        kept, keys = anim.weight_tracks_to_frames(samples, [[0] * 5, [1, 0.5, 0, 0.5, 1], [0, 0.5, 1, 0.5, 0]])
        self.assertEqual(kept, [1, 2])
        self.assertEqual(keys[0], [(0, 1), (2, 0), (4, 1)])


class ObjAndCoordTests(unittest.TestCase):
    def test_parse_ps2iodb_obj(self):
        data = parse_obj("# OBJ file\nmtllib a.ico.mtl\n"
                         "v 1 2 3 0.5 0.25 1 #0.5\nv 4 5 6 1 1 1 #1\nv 7 8 9 0 0 0 #0\n"
                         "vt 0 0 0\nvt 1 0 0\nvt 0 1 0\nvn 0 1 0\nvn 0 1 0\nvn 0 1 0\n"
                         "usemtl Texture\nf 1/1/1 2/2/2 3/3/3")
        self.assertEqual(data.mtllib, 'a.ico.mtl')
        self.assertEqual(data.colors[0], (0.5, 0.25, 1.0, 0.5))
        self.assertEqual(data.triangles, [((0, 0, 0), (1, 1, 1), (2, 2, 2))])
        self.assertEqual(parse_mtl_texture("newmtl Texture\nmap_Kd a.ico.png\n"), 'a.ico.png')

    def test_coords_round_trip(self):
        point = (1.0, -2.0, 3.0)
        self.assertEqual(coords.blender_to_ps2(coords.ps2_to_blender(point)), point)
        # PS2 Y is down, Blender Z is up.
        self.assertEqual(coords.ps2_to_blender((0, -1, 0)), (0, 0, 1))
        # OBJ positions are the PS2 position with X and Y negated.
        self.assertEqual(coords.obj_position_to_blender((-1.0, 2.0, 3.0)), coords.ps2_to_blender((1.0, -2.0, 3.0)))


if __name__ == '__main__':
    unittest.main()
