#!/usr/bin/env python3
"""
Generate complete Android launcher icons (adaptive foreground, legacy square, round)
and splash screens for JMK HRMS using the official vortex flower logo from frontend/public/icon-512.png.
"""

import os
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC_ICON = os.path.join(ROOT, 'frontend/public/icon-512.png')
RES_DIR = os.path.join(ROOT, 'frontend/android/app/src/main/res')

base_img = Image.open(SRC_ICON).convert('RGBA')
w, h = base_img.size

# 1. Create transparent foreground (logo only, transparent background)
fg_img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
pixels = base_img.load()
fg_pixels = fg_img.load()

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        brightness = (r + g + b) / 3.0
        if brightness > 245:
            fg_pixels[x, y] = (255, 255, 255, 0)
        else:
            fg_pixels[x, y] = (r, g, b, a)

# 2. Sizes for adaptive foreground (108dp canvas)
fg_sizes = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432
}

# 3. Sizes for legacy launcher icons (48dp canvas)
launcher_sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
}

print('Generating Android mipmap launcher icons...')

for folder, size in fg_sizes.items():
    target_dir = os.path.join(RES_DIR, folder)
    os.makedirs(target_dir, exist_ok=True)
    
    # Adaptive foreground
    fg_resized = fg_img.resize((size, size), Image.Resampling.LANCZOS)
    fg_resized.save(os.path.join(target_dir, 'ic_launcher_foreground.png'))

for folder, size in launcher_sizes.items():
    target_dir = os.path.join(RES_DIR, folder)
    os.makedirs(target_dir, exist_ok=True)

    # Standard square icon with solid white background
    square_img = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    # Place logo inside (scaled to ~80% of size)
    inner_size = int(size * 0.85)
    offset = (size - inner_size) // 2
    logo_part = fg_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    square_img.paste(logo_part, (offset, offset), logo_part)
    square_img.save(os.path.join(target_dir, 'ic_launcher.png'))

    # Round icon (solid white circle with logo inside)
    round_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(round_img)
    draw.ellipse((0, 0, size - 1, size - 1), fill=(255, 255, 255, 255))
    round_img.paste(logo_part, (offset, offset), logo_part)
    round_img.save(os.path.join(target_dir, 'ic_launcher_round.png'))

print('Generated all mipmap launcher icons successfully.')

# 4. Generate splash screens (pure white background with centered logo)
splash_sizes = {
    'drawable': (480, 320),
    'drawable-land-mdpi': (480, 320),
    'drawable-land-hdpi': (800, 480),
    'drawable-land-xhdpi': (1280, 720),
    'drawable-land-xxhdpi': (1600, 960),
    'drawable-land-xxxhdpi': (1920, 1280),
    'drawable-port-mdpi': (320, 480),
    'drawable-port-hdpi': (480, 800),
    'drawable-port-xhdpi': (720, 1280),
    'drawable-port-xxhdpi': (960, 1600),
    'drawable-port-xxxhdpi': (1280, 1920)
}

print('Generating Android splash screens...')
for folder, (sw, sh) in splash_sizes.items():
    target_dir = os.path.join(RES_DIR, folder)
    os.makedirs(target_dir, exist_ok=True)
    
    splash = Image.new('RGBA', (sw, sh), (255, 255, 255, 255))
    # Logo dimension ~ min(sw, sh) * 0.35
    logo_dim = int(min(sw, sh) * 0.38)
    lx = (sw - logo_dim) // 2
    ly = (sh - logo_dim) // 2
    logo_part = fg_img.resize((logo_dim, logo_dim), Image.Resampling.LANCZOS)
    splash.paste(logo_part, (lx, ly), logo_part)
    splash.convert('RGB').save(os.path.join(target_dir, 'splash.png'))

print('Generated all splash screens successfully.')

# 5. Clean up old conflicting capacitor robot vector if it exists
robot_vector = os.path.join(RES_DIR, 'drawable-v24', 'ic_launcher_foreground.xml')
if os.path.exists(robot_vector):
    os.remove(robot_vector)
    print(f'Removed obsolete {robot_vector}')

# 6. Ensure background vector is pure white
bg_vector = os.path.join(RES_DIR, 'drawable', 'ic_launcher_background.xml')
with open(bg_vector, 'w') as f:
    f.write('''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportHeight="108"
    android:viewportWidth="108">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M0,0h108v108h-108z" />
</vector>
''')
print('Updated drawable/ic_launcher_background.xml to pure white.')

# 7. Ensure values/ic_launcher_background.xml is pure white
values_bg = os.path.join(RES_DIR, 'values', 'ic_launcher_background.xml')
with open(values_bg, 'w') as f:
    f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFFFFF</color>
</resources>
''')
print('Updated values/ic_launcher_background.xml to pure white.')
print('All Android icons and graphics updated!')
