import json
import sys

# Import translations
sys.path.insert(0, r'E:\Tina\自研背单词软件')
from translations_data import translations

# Load words.json
with open(r'E:\Tina\自研背单词软件\words.json', 'r', encoding='utf-8') as f:
    words_data = json.load(f)

print("Loaded " + str(len(words_data)) + " words")

# Build index: number -> word object
word_index = {}
for w in words_data:
    word_index[w['number']] = w

# Apply translations
fixed_count = 0
skipped_count = 0
errors = []

for idx, num, exIdx, en_text, zh_text in translations:
    if num not in word_index:
        errors.append("Word number " + str(num) + " not found")
        continue
    
    word_obj = word_index[num]
    examples = word_obj.get('examples', [])
    
    if exIdx >= len(examples):
        errors.append("exIdx " + str(exIdx) + " out of range for word " + str(num) + " '" + word_obj.get('word', '') + "' (only " + str(len(examples)) + " examples)")
        continue
    
    # Build new example: cleaned English + Chinese
    new_example = en_text + ' ' + zh_text
    examples[exIdx] = new_example
    fixed_count += 1

# Save
with open(r'E:\Tina\自研背单词软件\words.json', 'w', encoding='utf-8') as f:
    json.dump(words_data, f, ensure_ascii=False, indent=2)

print("Saved words.json")
print("Fixed: " + str(fixed_count) + " examples")
if errors:
    print("Errors (" + str(len(errors)) + "):")
    for e in errors:
        print("  " + e)

# Verify
with open(r'E:\Tina\自研背单词软件\words.json', 'r', encoding='utf-8') as f:
    verify = json.load(f)
print("Word count verified: " + str(len(verify)))
