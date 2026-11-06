"""Regenerate install assets from the approved logo. Requires Pillow (authoring only)."""
from pathlib import Path
import json
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / 'public/icons'
SPLASH = ROOT / 'public/splash'
ICONS.mkdir(exist_ok=True)
SPLASH.mkdir(exist_ok=True)
# Isolate the approved white mark, removing the presentation tile and white corners.
source = Image.open(ROOT / 'output/branding/pocketdays-logo.png').convert('L')
mark = source.crop((240, 190, 1010, 1120))
mark = mark.point(lambda p: 255 if p >= 160 else 0)
mark = mark.crop(mark.getbbox())
BG = '#0d0f10'

def tile(size, fraction=.72):
    canvas = Image.new('RGB', (size, size), BG)
    alpha = ImageOps.contain(mark, (round(size*fraction), round(size*fraction)), Image.Resampling.LANCZOS)
    canvas.paste('white', ((size-alpha.width)//2, (size-alpha.height)//2), alpha)
    return canvas

for size in (16, 32, 48, 180, 192, 512):
    tile(size).save(ICONS / f'icon-{size}.png', optimize=True)
# All foreground pixels fit inside the maskable 80%-diameter safe circle.
tile(512, .60).save(ICONS / 'icon-maskable-512.png', optimize=True)
tile(256).save(ROOT / 'public/favicon.ico', sizes=[(16,16),(32,32),(48,48)])
tile(180).save(ROOT / 'public/apple-touch-icon.png', optimize=True)
# CSS screen dimensions and pixel density; both orientations for iPhone/iPad.
devices = [(320,568,2),(375,667,2),(414,736,3),(375,812,3),(390,844,3),
           (393,852,3),(402,874,3),(414,896,2),(414,896,3),(428,926,3),
           (430,932,3),(440,956,3),(768,1024,2),(810,1080,2),
           (820,1180,2),(834,1112,2),(834,1194,2),(1024,1366,2),(1032,1376,2)]
links=[]
for width,height,ratio in devices:
    for orientation in ('portrait','landscape'):
        w,h=(width,height) if orientation=='portrait' else (height,width)
        canvas=Image.new('RGB',(w*ratio,h*ratio),BG)
        logo=tile(112*ratio)
        canvas.paste(logo,((canvas.width-logo.width)//2,(canvas.height-logo.height)//2))
        name=f'apple-{w*ratio}x{h*ratio}.png'
        canvas.save(SPLASH/name,optimize=True)
        links.append(f'<link rel="apple-touch-startup-image" href="splash/{name}" media="screen and (device-width: {width}px) and (device-height: {height}px) and (-webkit-device-pixel-ratio: {ratio}) and (orientation: {orientation})">')
index=ROOT/'src/index.html'
s=index.read_text()
start='<!-- Generated startup images -->'
end='<!-- End startup images -->'
if start in s:
    s=s[:s.index(start)]+s[s.index(end)+len(end):]
s=s.replace('</head>',start+'\n'+'\n'.join(links)+'\n'+end+'\n</head>')
index.write_text(s)
