import json, sys

with open(r'E:\Tina\自研背单词软件\extracted_words.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Show handbook entries with examples
hb = [d for d in data if isinstance(d, dict) and 'PDF' in str(d.get('source', ''))]
print(f"Handbook entries: {len(hb)}")
for d in hb[:3]:
    sys.stdout.buffer.write(json.dumps(d, ensure_ascii=False, indent=2).encode('utf-8'))
    sys.stdout.buffer.write(b'\n---\n')

# Find adventure in any
for d in data:
    if isinstance(d, dict) and d.get('word', '').lower() == 'adventure':
        sys.stdout.buffer.write(b'ADVENTURE FOUND:\n')
        sys.stdout.buffer.write(json.dumps(d, ensure_ascii=False, indent=2).encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
