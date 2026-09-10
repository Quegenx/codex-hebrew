#!/usr/bin/env python3
from collections import deque
from pathlib import Path
from PIL import Image

# Official ChatGPT.icns artwork sits in this box on a 1024 canvas.
TARGET = 1024
CONTENT = 842

def flood_black(image):
    image = image.convert('RGBA')
    width, height = image.size
    pixels = image.load()
    seen = bytearray(width * height)
    queue = deque()

    for x, y in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)):
        queue.append((x, y))
        seen[y * width + x] = 1
    while queue:
        x, y = queue.popleft()
        red, green, blue, _alpha = pixels[x, y]
        if red > 16 or green > 16 or blue > 16:
            continue
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                continue
            marker = ny * width + nx
            if seen[marker]:
                continue
            seen[marker] = 1
            nred, ngreen, nblue, _ = pixels[nx, ny]
            if nred <= 16 and ngreen <= 16 and nblue <= 16:
                queue.append((nx, ny))
    return image

def content_box(image):
    box = image.getchannel('A').point(lambda alpha: 255 if alpha > 16 else 0).getbbox()
    if box is None:
        raise SystemExit('No opaque icon content after removing the black field')
    return box

def make_canvas(source, content):
    artwork = flood_black(Image.open(source))
    cropped = artwork.crop(content_box(artwork))
    cropped.thumbnail((content, content), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (TARGET, TARGET), (0, 0, 0, 0))
    canvas.paste(cropped, ((TARGET - cropped.size[0]) // 2, (TARGET - cropped.size[1]) // 2), cropped)
    return canvas

if __name__ == '__main__':
    import sys
    source, png_out = sys.argv[1], sys.argv[2]
    canvas = make_canvas(source, CONTENT)
    Path(png_out).parent.mkdir(parents=True, exist_ok=True)
    if Path(png_out).suffix.lower() == '.ico':
        canvas.save(png_out, 'ICO', sizes=[(size, size) for size in (16, 20, 24, 32, 40, 48, 64, 128, 256)])
    else:
        canvas.save(png_out, 'PNG')
