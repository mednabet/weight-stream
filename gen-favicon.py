from PIL import Image

img = Image.open('/home/ubuntu/weight-stream/public/icon-512.png')

# Create proper multi-size ICO
# PIL's ICO save needs the images passed differently
sizes = [16, 32, 48, 64, 128, 256]
icon_images = []
for s in sizes:
    resized = img.copy()
    resized = resized.resize((s, s), Image.LANCZOS)
    icon_images.append(resized)

# Save with the largest as the base
icon_images[-1].save(
    '/home/ubuntu/weight-stream/public/favicon.ico',
    format='ICO',
    append_images=icon_images[:-1]
)

print(f"favicon.ico created with sizes: {sizes}")

import os
size = os.path.getsize('/home/ubuntu/weight-stream/public/favicon.ico')
print(f"File size: {size} bytes")
