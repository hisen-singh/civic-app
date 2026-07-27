"""
Convert logo.jpg to a square 1024x1024 PNG with padding for Expo/Android.
Uses only PIL (Pillow).
"""
from PIL import Image
import os

ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets')
INPUT = os.path.join(ASSETS_DIR, 'logo.jpg')
OUTPUT_ICON = os.path.join(ASSETS_DIR, 'icon.png')
OUTPUT_SPLASH = os.path.join(ASSETS_DIR, 'splash.png')
OUTPUT_ADAPTIVE = os.path.join(ASSETS_DIR, 'adaptive-icon.png')

BG_COLOR = (10, 14, 26)  # #0A0E1A — app background

def make_square(img, size=1024):
    """Center the image on a square canvas with background color."""
    w, h = img.size
    # Scale to fit within size x size
    scale = min(size / w, size / h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    img_resized = img.resize((new_w, new_h), Image.LANCZOS)
    
    canvas = Image.new('RGBA', (size, size), (*BG_COLOR, 255))
    x = (size - new_w) // 2
    y = (size - new_h) // 2
    canvas.paste(img_resized, (x, y))
    return canvas

def make_splash(img, width=1284, height=2778):
    """Center the logo on a splash screen canvas."""
    logo_size = min(width, height) // 3
    w, h = img.size
    scale = min(logo_size / w, logo_size / h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    img_resized = img.resize((new_w, new_h), Image.LANCZOS)
    
    canvas = Image.new('RGBA', (width, height), (*BG_COLOR, 255))
    x = (width - new_w) // 2
    y = (height - new_h) // 2
    canvas.paste(img_resized, (x, y))
    return canvas

img = Image.open(INPUT).convert('RGBA')

# 1024x1024 square icon
icon = make_square(img, 1024)
icon.save(OUTPUT_ICON, 'PNG')
print(f'[OK] Created {OUTPUT_ICON} ({icon.size})')

# Adaptive icon (same square, maybe slightly padded for safe zone)
adaptive = make_square(img, 1024)
adaptive.save(OUTPUT_ADAPTIVE, 'PNG')
print(f'[OK] Created {OUTPUT_ADAPTIVE} ({adaptive.size})')

# Splash screen
splash = make_splash(img)
splash.save(OUTPUT_SPLASH, 'PNG')
print(f'[OK] Created {OUTPUT_SPLASH} ({splash.size})')

print('\n[DONE] All icon assets generated. Update app.json to reference these files.')
