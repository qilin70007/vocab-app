import json, sys

with open(r'E:\Tina\自研背单词软件\words.json', 'r', encoding='utf-8') as f:
    words = json.load(f)

print(f"Total words: {len(words)}")

# Check words 1-5 and adventure
for i in [0, 1, 2, 22]:
    if i < len(words):
        w = words[i]
        sys.stdout.buffer.write(json.dumps(w, ensure_ascii=False, indent=2).encode('utf-8'))
        sys.stdout.buffer.write(b'\n---\n')

# Find adventure
for i, w in enumerate(words):
    if w.get('word', '').lower() == 'adventure':
        print(f"\nAdventure at index {i}:")
        sys.stdout.buffer.write(json.dumps(w, ensure_ascii=False, indent=2).encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
        break
