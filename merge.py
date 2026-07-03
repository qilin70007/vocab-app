# -*- coding: utf-8 -*-
import json
import os

# Paths
base = r'E:\Tina\自研背单词软件'
empty_path = os.path.join(base, 'empty_examples.json')
words_path = os.path.join(base, 'words.json')
examples_path = os.path.join(base, 'examples_data.json')

# Read files
with open(empty_path, 'r', encoding='utf-8') as f:
    empty_list = json.load(f)

with open(words_path, 'r', encoding='utf-8') as f:
    words = json.load(f)

with open(examples_path, 'r', encoding='utf-8') as f:
    examples = json.load(f)

# Build lookup
word_map = {w['number']: w for w in words}

filled = 0
not_found = []

for item in empty_list:
    num = item['num']
    entry = word_map.get(num)
    if entry is None:
        not_found.append(num)
        continue
    if not entry.get('examples') or len(entry['examples']) == 0:
        ex = examples.get(str(num))
        if ex:
            entry['examples'] = ex
            filled += 1
        else:
            not_found.append(num)

print(f"Filled: {filled}")
print(f"Not found: {len(not_found)}")
if not_found:
    print(f"Missing: {not_found}")

# Save back
with open(words_path, 'w', encoding='utf-8') as f:
    json.dump(words, f, ensure_ascii=False, indent=2)

print("Done! File saved.")
