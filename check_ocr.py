import json, sys

with open(r'E:\Tina\自研背单词软件\ocr_parsed_words.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total entries: {len(data)}")
# Find min and max number
numbers = [d.get('number', 0) for d in data]
print(f"Min number: {min(numbers)}, Max number: {max(numbers)}")

# Check if adventure is in there
for d in data:
    if d.get('word', '').lower() == 'adventure':
        output = json.dumps(d, ensure_ascii=False, indent=2)
        sys.stdout.buffer.write(output.encode('utf-8'))
        break
else:
    print("adventure NOT found in ocr_parsed_words.json")

# Check first few entries
for d in data[:3]:
    print(f"  number={d.get('number')}, word={d.get('word')}")
