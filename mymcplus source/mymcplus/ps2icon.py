#
# This file is part of mymc+, based on mymc by Ross Ridge.
#
# mymc+ is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# mymc+ is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with mymc+.  If not, see <http://www.gnu.org/licenses/>.
#

"""Interface for working with PS2 icons."""

import struct


class Error(Exception):
    """Base for all exceptions specific to this module."""
    pass

class Corrupt(Error):
    """Corrupt icon file."""

    def __init__(self, msg):
        super().__init__(self, "Corrupt icon: " + msg)

class FileTooSmall(Error):
    """Corrupt icon file."""

    #def __init__(self):
    #    super().__init__(self, "Icon file too small.")

    def __init__(self, message = "Icon file too small."):
        super().__init__(self, message)


_PS2_ICON_MAGIC = 0x010000

_FIXED_POINT_FACTOR = 4096.0

TEXTURE_WIDTH = 128
TEXTURE_HEIGHT = 128

_TEXTURE_SIZE = TEXTURE_WIDTH * TEXTURE_HEIGHT * 2

_icon_header_struct = struct.Struct("<IIIII")

_vertex_coords_struct = struct.Struct("<hhhH")
_normal_struct = struct.Struct("<hhhH")
_uv_struct = struct.Struct("<hh")
_color_struct = struct.Struct("<BBBB")

_anim_header_struct = struct.Struct("<IIfII")
_frame_data_struct = struct.Struct("<IIII")
_frame_key_struct = struct.Struct("<ff")

_texture_compressed_size_struct = struct.Struct("<I")

import ctypes
uint8_t = ctypes.c_uint8
int16_t = ctypes.c_int16

class Icon:
    class AnimationHeader:
        def __init__(self):
            self.id_tag = 0
            self.frame_length = 0
            self.anim_speed = 0
            self.play_offset = 0
            self.frame_count = 0
        def __str__(self):
            return f"{{ id_tag: {self.id_tag}, frame_length: {self.frame_length}, anim_speed: {self.anim_speed}, play_offset: {self.play_offset}, frame_count: {self.frame_count} }}"
    class Frame:
        class Key:
            def __init__(self):
                self.time = 0.0
                self.value = 0.0
            def __str__(self):
                return f"{{ time: {self.time}, value: {self.value} }}"
        def __init__(self):
            self.shape_id = 0
            self.key_count = 0
            self.unknown_1 = 0
            self.unknown_2 = 0
            self.keys = []
        def __str__(self):
            return f"{{ shape_id: {self.shape_id}, key_count: {self.key_count}, unknown_1: {self.unknown_1}, unknown_2: {self.unknown_2} }}"



    def __init__(self, data):
        self.animation_shapes = 0
        self.texture_type = 0   
        self.header_unknown = 0
        self.vertex_count = 0

        self.vertex_data = None
        self.vertex_normals = None
        self.uv_data = None
        self.color_data = None
        self.texture = None
        self.enable_alpha = False

        length = len(data)
        offset = 0

        offset = self.__load_header(data, length, offset)
        offset = self.__load_vertex_data(data, length, offset)
        offset = self.__load_animation_data(data, length, offset)
        offset = self.__load_texture(data, length, offset)

        if length > offset:
            print(f"Warning: Icon file larger than expected. Reached offset {offset} but total length is {length}, difference of {length - offset}.")

        print("_____________________________")


    def __load_header(self, data, length, offset):
        if length < _icon_header_struct.size:
            raise FileTooSmall("Data length is smaller than expected icon header size.")

        (magic,
         self.animation_shapes,
         self.texture_type,
         self.header_unknown,
         self.vertex_count) = _icon_header_struct.unpack_from(data, offset)
        
        print(f"Icon header loaded: {{ animation_shapes: {self.animation_shapes}, texture_type: {self.texture_type}, unknown: {self.header_unknown}, vertex_count: {self.vertex_count} }}.")

        if magic != _PS2_ICON_MAGIC:
            raise Corrupt("Invalid magic.")

        return offset + _icon_header_struct.size


    def __load_vertex_data(self, data, length, offset):
        stride = _vertex_coords_struct.size * self.animation_shapes \
                 + _normal_struct.size + _uv_struct.size + _color_struct.size

        if length < offset + self.vertex_count * stride:
            raise FileTooSmall("Data length is smaller than expected vertex data size.")

        self.vertex_data = (int16_t * (self.animation_shapes * 3 * self.vertex_count))()
        self.vertex_normals = (int16_t * (3 * self.vertex_count))()
        self.uv_data = (int16_t * (2 * self.vertex_count))()
        self.color_data = (uint8_t * (4 * self.vertex_count))()

        for i in range(self.vertex_count):
            for s in range(self.animation_shapes):
                vertex_offset = (s * self.vertex_count + i) * 3
                (self.vertex_data[vertex_offset],
                 self.vertex_data[vertex_offset+1],
                 self.vertex_data[vertex_offset+2],
                 _) = _vertex_coords_struct.unpack_from(data, offset)
                offset += _vertex_coords_struct.size

            # NormalXYZ #  U/V  # NormalXYZ #  U/V  #
            # 0 # 1 # 2 # 3 # 4 # 0 # 1 # 2 # 3 # 4 #
            #########################################...
            #         0         #         1         #

            (self.vertex_normals[i*3],
             self.vertex_normals[i*3+1],
             self.vertex_normals[i*3+2],
             _) = _normal_struct.unpack_from(data, offset)
            offset += _normal_struct.size
            
            (self.uv_data[i*2],
             self.uv_data[i*2+1]) = _uv_struct.unpack_from(data, offset)
            offset += _uv_struct.size

            (self.color_data[i*4],
             self.color_data[i*4+1],
             self.color_data[i*4+2],
             self.color_data[i*4+3]) = _color_struct.unpack_from(data, offset)
            offset += _color_struct.size

            # This is just a hack to check if every alpha value is 0, which is the case for THPS3 for example.
            # Alpha will then be assumed to be 1 for all vertices when rendering, otherwise nothing will be visible.
            # TODO: There is probably another way to render these icons correctly.
            if self.color_data[i*4+3] > 0:
                self.enable_alpha = True

        return offset

    def __load_animation_data(self, data, length, offset):
        if length < offset + _anim_header_struct.size:
            raise FileTooSmall("Data length is smaller than expected animation data size.")

        self.anim_header = self.AnimationHeader()
        (self.anim_header.id_tag,
         self.anim_header.frame_length,
         self.anim_header.anim_speed,
         self.anim_header.play_offset,
         self.anim_header.frame_count) = _anim_header_struct.unpack_from(data, offset)

        print(f"Animation header loaded: {self.anim_header}.")

        offset += _anim_header_struct.size

        if self.anim_header.id_tag != 0x01:
            raise Corrupt("Invalid ID tag in animation header: {:#x}".format(self.anim_header.id_tag))

        self.frames = []
        for i in range(self.anim_header.frame_count):
            if length < offset + _frame_data_struct.size:
                raise FileTooSmall("Data length is smaller than expected frame data size.")

            frame = self.Frame()
            (frame.shape_id,
             frame.key_count,
             frame.unknown_1,
             frame.unknown_2) = _frame_data_struct.unpack_from(data, offset)
            frame.key_count -= 1;   # Is always 1 too large for some reason.

            print(f"Frame {i}: {frame}.")

            offset += _frame_data_struct.size

            for k in range(frame.key_count):
                if length < offset + _frame_key_struct.size:
                    raise FileTooSmall("Data length is smaller than expected frame key size.")

                key = self.Frame.Key()
                (key.time,
                 key.value) = _frame_key_struct.unpack_from(data, offset)
                frame.keys.append(key)
                #printf("")

                print(f"Frame {i} Key {k}: {key}.")

                offset += _frame_key_struct.size

            self.frames.append(frame)

        return offset


    def __load_texture(self, data, length, offset):
        uncompressed_types = [6, 7]
        is_uncompressed = self.texture_type in uncompressed_types
        #technique_name = "uncompressed" if is_uncompressed else "compressed"
        #print(f"self.tex_type is {self.texture_type}. Loading with {technique_name} technique.")

        if is_uncompressed:
            return self.__load_texture_uncompressed(data, length, offset)
        else:
            return self.__load_texture_compressed(data, length, offset)


    def __load_texture_uncompressed(self, data, length, offset):
        if length < offset + _TEXTURE_SIZE:
            raise FileTooSmall("Data length is smaller than expected uncompressed texture size.")

        self.texture = data[offset:(offset + _TEXTURE_SIZE)]

        return offset + _TEXTURE_SIZE


    def __load_texture_compressed(self, data, length, offset):
        if length < offset + 4:
            raise FileTooSmall("Data length is smaller than expected compressed texture header size.")

        compressed_size = _texture_compressed_size_struct.unpack_from(data, offset)[0]
        offset += _texture_compressed_size_struct.size

        if length < offset + compressed_size:
            raise FileTooSmall("Data length is smaller than expected compressed texture size.")

        if compressed_size % 2 != 0:
            raise Corrupt("Compressed data size is odd.")

        texture_buf = bytearray(_TEXTURE_SIZE)

        tex_offset = 0
        rle_offset = 0

        while rle_offset < compressed_size:
            rle_code = int(data[offset + rle_offset]) | (int(data[offset + rle_offset + 1]) << 8)
            rle_offset += 2

            if rle_code & 0xff00 == 0xff00: # use the next (0xffff - rle_code) * 2 bytes as they are
                sublength = (0x10000 - rle_code) * 2
                if compressed_size < rle_offset + sublength:
                    raise Corrupt("Compressed data is too short.")
                if tex_offset + sublength > _TEXTURE_SIZE:
                    raise Corrupt("Decompressed data exceeds texture size.")

                for i in range(sublength):
                    texture_buf[tex_offset] = data[offset + rle_offset]
                    tex_offset += 1
                    rle_offset += 1

            else: # repeat next 2 bytes rle_code times
                rep = rle_code
                if compressed_size < rle_offset + 2:
                    raise Corrupt("Compressed data is too short.")
                if tex_offset + rep * 2 > _TEXTURE_SIZE:
                    raise Corrupt("Decompressed data exceeds texture size.")

                subdata = data[(offset + rle_offset):(offset + rle_offset + 2)]
                rle_offset += 2

                for i in range(rep):
                    texture_buf[tex_offset] = subdata[0]
                    texture_buf[tex_offset+1] = subdata[1]
                    tex_offset += 2

        assert rle_offset == compressed_size

        self.texture = bytes(texture_buf)

        return offset + compressed_size
