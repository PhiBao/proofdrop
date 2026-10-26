from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "apps", "web", "public")
ORANGE = (255, 77, 0, 255)
INK = (21, 19, 15, 255)

def rounded_bg(size, radius):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=ORANGE)
    return img, d

def draw_mark(d, size):
    s = size / 64.0
    w = max(2, int(5 * s))
    # NAND body: left edge, top, semicircle, bottom
    left = int(15 * s)
    top = int(18 * s)
    bottom = int(46 * s)
    mid = int(32 * s)
    body_right = int(31.5 * s)
    d.line([(left, top), (body_right, top)], fill=INK, width=w)
    d.line([(left, bottom), (body_right, bottom)], fill=INK, width=w)
    d.line([(left, top), (left, bottom)], fill=INK, width=w)
    r = (bottom - top) // 2
    d.arc([body_right - r, top, body_right + r, bottom], start=-90, end=90, fill=INK, width=w)
    # leads
    d.line([(int(7 * s), int(25 * s)), (left, int(25 * s))], fill=INK, width=w)
    d.line([(int(7 * s), int(39 * s)), (left, int(39 * s))], fill=INK, width=w)
    d.line([(body_right + r, mid), (int(57 * s), mid)], fill=INK, width=w)
    dot = int(3.2 * s)
    d.ellipse([int(44.5 * s) - dot, mid - dot, int(44.5 * s) + dot, mid + dot], fill=INK)

for size, name in [(512, "favicon-512.png"), (180, "apple-touch-icon.png"), (32, "favicon-32.png")]:
    scale = 4
    big = size * scale
    img, d = rounded_bg(big, int(big * (6 / 64)))
    draw_mark(d, big)
    img = img.resize((size, size), Image.LANCZOS)
    img.save(os.path.join(PUBLIC, name))

# Open Graph card
W, H = 1200, 630
og = Image.new("RGB", (W, H), (246, 240, 228))
d = ImageDraw.Draw(og)
# grid
for x in range(0, W, 72):
    d.line([(x, 0), (x, H)], fill=(230, 221, 205), width=1)
for y in range(0, H, 72):
    d.line([(0, y), (W, y)], fill=(230, 221, 205), width=1)
# orange block
d.rectangle([72, 72, 152, 152], fill=ORANGE)
mark = Image.open(os.path.join(PUBLIC, "favicon-512.png")).resize((80, 80), Image.LANCZOS)
og.paste(mark, (72, 72), mark)
try:
    display = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 128)
    body = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 34)
    mono = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 22)
except Exception:
    display = body = mono = ImageFont.load_default()
d.text((72, 220), "Giveaways", font=display, fill=INK)
d.text((72, 330), "no one has", font=display, fill=INK)
d.text((72, 440), "to trust.", font=display, fill=ORANGE)
d.text((72, 590), "PROOFDROP  ·  ESCROW + CIRCUIT DECISION + PROOF  ·  X LAYER", font=mono, fill=(117, 107, 92))
og.save(os.path.join(PUBLIC, "og.png"))
print("icons written")
