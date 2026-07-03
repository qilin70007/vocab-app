import json, sys

# Check words_raw.json for adventure
with open(r'E:\Tina\自研背单词软件\words_raw.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

print(f"words_raw.json: {len(raw)} entries")
for i in [0, 1, 2]:
    if i < len(raw):
        sys.stdout.buffer.write(json.dumps(raw[i], ensure_ascii=False).encode('utf-8'))
        sys.stdout.buffer.write(b'\n')

# Find adventure
for i, w in enumerate(raw):
    if w.get('word', '').lower() == 'adventure':
        print(f"\nAdventure at index {i} in words_raw:")
        sys.stdout.buffer.write(json.dumps(w, ensure_ascii=False, indent=2).encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
        break
else:
    print("adventure NOT in words_raw.json")
