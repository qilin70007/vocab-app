import json, sys

with open(r'E:\Tina\自研背单词软件\words.json', 'r', encoding='utf-8') as f:
    words = json.load(f)

# Words with number 1-101
early_words = [w for w in words if 1 <= w.get('number', 0) <= 101]
print(f"Words with number 1-101: {len(early_words)}")

# Check their source
sources = {}
for w in early_words:
    src = w.get('source', 'unknown')
    if src not in sources:
        sources[src] = 0
    sources[src] += 1

for src, cnt in sorted(sources.items()):
    print(f"  source={src}: {cnt} words")

# Show words around adventure (number 20-26)
print("\nWords around adventure:")
for w in words:
    n = w.get('number', 0)
    if 20 <= n <= 26:
        ex = w.get('examples', [])
        ex_str = ex[0][:60] if ex else '(none)'
        print(f"  #{n} {w['word']}: {ex_str}")
