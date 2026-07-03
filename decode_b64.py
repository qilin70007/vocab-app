import base64, os

for name in ['b64_1.txt', 'b64_2.txt']:
    path = os.path.join(r'E:\Tina\自研背单词软件', name)
    if os.path.exists(path):
        with open(path, 'r') as f:
            data = f.read().strip()
        img_data = base64.b64decode(data)
        out = path.replace('.txt', '.png')
        with open(out, 'wb') as f:
            f.write(img_data)
        print(f"Decoded {name} -> {out} ({len(img_data)} bytes)")
    else:
        print(f"{name} not found")
