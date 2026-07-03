import json, sys

with open(r'E:\Tina\自研背单词软件\words_enhanced.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total: {len(data)}")

# Find adventure
for i, w in enumerate(data):
    if isinstance(w, dict) and w.get('word', '').lower() == 'adventure':
        print(f"Index {i}:")
        sys.stdout.buffer.write(json.dumps(w, ensure_ascii=False, indent=2).encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
        break

# Check what source
sources = {}
for w in data:
    if isinstance(w, dict):
        s = str(w.get('source', w.get('src', 'unknown')))
        sources[s] = sources.get(s, 0) + 1
print("\nSources:")
for s, c in sorted(sources.items(), key=lambda x: -x[1]):
    print(f"  {s}: {c}")
