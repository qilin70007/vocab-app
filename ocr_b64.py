import pytesseract
from PIL import Image
import os, sys

for name in ['b64_1.png', 'b64_2.png']:
    path = os.path.join(r'E:\Tina\自研背单词软件', name)
    if os.path.exists(path):
        img = Image.open(path)
        text = pytesseract.image_to_string(img)
        header = f"=== {name} ===\n".encode('utf-8')
        sys.stdout.buffer.write(header)
        sys.stdout.buffer.write(text.encode('utf-8', 'replace'))
        sys.stdout.buffer.write(b'\n\n')
