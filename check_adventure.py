import json, sys

with open(r'E:\Tina\自研背单词软件\words.json', 'r', encoding='utf-8') as f:
    words = json.load(f)

for w in words:
    if w.get('word', '').lower() == 'adventure':
        output = json.dumps(w, ensure_ascii=False, indent=2)
        sys.stdout.buffer.write(output.encode('utf-8'))
        break
