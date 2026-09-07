#!/usr/bin/env python3
import struct
import sys
from pathlib import Path

RT_ICON = 3
RT_GROUP_ICON = 14
LANG_NEUTRAL = 0x0409

def icon_images(ico_path):
    data = Path(ico_path).read_bytes()
    reserved, ico_type, count = struct.unpack_from('<HHH', data, 0)
    if reserved != 0 or ico_type != 1 or count < 1:
        raise SystemExit('Not a Windows ICO file')
    images = []
    for index in range(count):
        width, height, colors, _reserved, planes, bit_count, size, offset = struct.unpack_from('<BBBBHHII', data, 6 + index * 16)
        images.append({
            'width': 256 if width == 0 else width,
            'height': 256 if height == 0 else height,
            'colors': colors,
            'planes': planes,
            'bit_count': bit_count,
            'bytes': data[offset:offset + size],
        })
    return images

def group_resource(images):
    payload = struct.pack('<HHH', 0, 1, len(images))
    for index, image in enumerate(images, start=1):
        width = 0 if image['width'] >= 256 else image['width']
        height = 0 if image['height'] >= 256 else image['height']
        payload += struct.pack('<BBBBHHIH', width, height, image['colors'], 0, image['planes'] or 1, image['bit_count'] or 32, len(image['bytes']), index)
    return payload

def embed(exe_path, ico_path):
    if sys.platform != 'win32':
        return
    header = Path(exe_path).read_bytes()[:2]
    if header != b'MZ':
        return
    import ctypes
    kernel32 = ctypes.windll.kernel32
    kernel32.BeginUpdateResourceW.restype = ctypes.c_void_p
    handle = kernel32.BeginUpdateResourceW(str(exe_path), False)
    if not handle:
        raise SystemExit(f'BeginUpdateResource failed for {exe_path}')
    images = icon_images(ico_path)
    try:
        for index, image in enumerate(images, start=1):
            if not kernel32.UpdateResourceW(ctypes.c_void_p(handle), RT_ICON, index, LANG_NEUTRAL, image['bytes'], len(image['bytes'])):
                raise SystemExit(f'UpdateResource icon {index} failed')
        group = group_resource(images)
        if not kernel32.UpdateResourceW(ctypes.c_void_p(handle), RT_GROUP_ICON, 1, LANG_NEUTRAL, group, len(group)):
            raise SystemExit('UpdateResource group icon failed')
        if not kernel32.EndUpdateResourceW(ctypes.c_void_p(handle), False):
            raise SystemExit('EndUpdateResource failed')
    except Exception:
        kernel32.EndUpdateResourceW(ctypes.c_void_p(handle), True)
        raise

if __name__ == '__main__':
    embed(sys.argv[1], sys.argv[2])
