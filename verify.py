import json

with open(r'E:\Tina\自研背单词软件\words.json', 'r', encoding='utf-8') as f:
    words_data = json.load(f)

# Check a few specific entries
checks = [45, 46, 96, 215, 1290, 1781]
for num in checks:
    w = None
    for item in words_data:
        if item['number'] == num:
            w = item
            break
    if w:
        print(str(num) + " " + w.get('word', '') + ":")
        for i, ex in enumerate(w.get('examples', [])):
            print("  [" + str(i) + "] " + ex[:120])
        print()

# Also check the total count
print("Total words: " + str(len(words_data)))

# Count examples that still have no Chinese (heuristic: no CJK chars)
import re
cjk_pattern = re.compile(r'[\u4e00-\u9fff]')
no_chinese = 0
total_examples = 0
for w in words_data:
    for ex in w.get('examples', []):
        total_examples += 1
        if not cjk_pattern.search(ex):
            no_chinese += 1

print("Total examples: " + str(total_examples))
print("Examples with no Chinese chars: " + str(no_chinese))
