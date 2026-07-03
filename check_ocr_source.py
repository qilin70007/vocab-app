import json, sys

# Check ocr_parsed_words.json - first few entries to understand the source
with open(r'E:\Tina\自研背单词软件\ocr_parsed_words.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total OCR entries: {len(data)}")
# Show first 3
for d in data[:3]:
    sys.stdout.buffer.write(json.dumps(d, ensure_ascii=False, indent=2).encode('utf-8'))
    sys.stdout.buffer.write(b'\n---\n')

# Check what word #102 is (since ocr starts at 102)
if len(data) > 0:
    print(f"\nFirst word: {data[0].get('word', 'unknown')}")
    print(f"Last word: {data[-1].get('word', 'unknown')}")
    
# Find if adventure is in OCR
adv = [d for d in data if d.get('word', '').lower() == 'adventure']
if adv:
    print(f"\nAdventure in OCR: {json.dumps(adv[0], ensure_ascii=False)}")
else:
    print("\nAdventure NOT in OCR data")
