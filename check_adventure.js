import json

with open(r'E:\Tina\自研背单词软件\words.json', 'r', encoding='utf-8') as f:
    words = json.load(f)

# Find adventure
for w in words:
    if w.get('word', '').lower() == 'adventure':
        print(json.dumps(w, ensure_ascii=False, indent=2))
        break
