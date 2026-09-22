#!/usr/bin/env python3
import os
import math
from PIL import Image, ImageDraw

def create_icons():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_path = "/Users/aishwarya/.gemini/antigravity-ide/brain/497567dd-e101-4a24-ac30-7f66cc549935/.user_uploaded/media_1789804209614.png"
    
    src = Image.open(src_path).convert("RGBA")
    
    # The black emblem inside the white squircle
    # Measured bounds in uploaded image: x=(54+296, 357+296), y=(53+215, 357+215)
    # i.e. x=(350, 654), y=(268, 572) -> 304 x 304 px
    emblem_raw = src.crop((350, 268, 654, 572))
    
    # Clean emblem: extract dark emblem pixels with alpha antialiasing
    w, h = emblem_raw.size
    emblem = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            r, g, b, a = emblem_raw.getpixel((x, y))
            brightness = (r + g + b) / 3.0
            if brightness < 210:
                alpha = int(min(255, max(0, (1.0 - (brightness / 210.0)) * 255 * 1.1)))
                emblem.putpixel((x, y), (15, 23, 42, alpha)) # Rich obsidian / black
            else:
                emblem.putpixel((x, y), (0, 0, 0, 0))
                
    # Helper to generate rounded squircle icon
    def make_squircle_icon(size, emblem_ratio=0.68, corner_radius_ratio=0.22):
        im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(im)
        radius = int(size * corner_radius_ratio)
        # Draw white squircle
        draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=(255, 255, 255, 255))
        
        # Overlay centered emblem
        emblem_size = int(size * emblem_ratio)
        scaled_emblem = emblem.resize((emblem_size, emblem_size), Image.Resampling.LANCZOS)
        offset = (size - emblem_size) // 2
        im.paste(scaled_emblem, (offset, offset), scaled_emblem)
        return im

    # Helper to generate circle icon
    def make_round_icon(size, emblem_ratio=0.64):
        im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(im)
        draw.ellipse([(0, 0), (size - 1, size - 1)], fill=(255, 255, 255, 255))
        
        emblem_size = int(size * emblem_ratio)
        scaled_emblem = emblem.resize((emblem_size, emblem_size), Image.Resampling.LANCZOS)
        offset = (size - emblem_size) // 2
        im.paste(scaled_emblem, (offset, offset), scaled_emblem)
        return im

    # Helper to generate adaptive foreground (transparent with centered emblem)
    def make_foreground_icon(size, emblem_ratio=0.58):
        im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        emblem_size = int(size * emblem_ratio)
        scaled_emblem = emblem.resize((emblem_size, emblem_size), Image.Resampling.LANCZOS)
        offset = (size - emblem_size) // 2
        im.paste(scaled_emblem, (offset, offset), scaled_emblem)
        return im

    # Helper to generate PWA maskable full-bleed white icon
    def make_pwa_icon(size):
        im = Image.new("RGBA", (size, size), (255, 255, 255, 255))
        emblem_size = int(size * 0.65) # Safe zone for maskable icons
        scaled_emblem = emblem.resize((emblem_size, emblem_size), Image.Resampling.LANCZOS)
        offset = (size - emblem_size) // 2
        im.paste(scaled_emblem, (offset, offset), scaled_emblem)
        return im

    # 1. PWA Icons in frontend/public and frontend/dist
    pwa_192 = make_pwa_icon(192)
    pwa_512 = make_pwa_icon(512)
    
    for base in [os.path.join(root, "frontend/public"), os.path.join(root, "frontend/dist")]:
        if os.path.exists(base):
            pwa_192.save(os.path.join(base, "icon-192.png"))
            pwa_512.save(os.path.join(base, "icon-512.png"))
            print(f"Saved PWA icons in {base}")

    # 2. Android Mipmap Icons
    res_dir = os.path.join(root, "frontend/android/app/src/main/res")
    mipmap_configs = [
        ("mipmap-mdpi", 48, 108),
        ("mipmap-hdpi", 72, 162),
        ("mipmap-xhdpi", 96, 216),
        ("mipmap-xxhdpi", 144, 324),
        ("mipmap-xxxhdpi", 192, 432),
    ]

    for folder, icon_size, fg_size in mipmap_configs:
        target_dir = os.path.join(res_dir, folder)
        os.makedirs(target_dir, exist_ok=True)
        
        sq = make_squircle_icon(icon_size)
        sq.save(os.path.join(target_dir, "ic_launcher.png"))
        
        rd = make_round_icon(icon_size)
        rd.save(os.path.join(target_dir, "ic_launcher_round.png"))
        
        fg = make_foreground_icon(fg_size)
        fg.save(os.path.join(target_dir, "ic_launcher_foreground.png"))
        print(f"Updated Android {folder}: {icon_size}x{icon_size}, FG {fg_size}x{fg_size}")

    # Also update in android web public assets
    android_public = os.path.join(root, "frontend/android/app/src/main/assets/public")
    if os.path.exists(android_public):
        pwa_192.save(os.path.join(android_public, "icon-192.png"))
        pwa_512.save(os.path.join(android_public, "icon-512.png"))
        print(f"Saved PWA icons in {android_public}")

    print("\n✅ All icons successfully generated and synced!")

if __name__ == "__main__":
    create_icons()
