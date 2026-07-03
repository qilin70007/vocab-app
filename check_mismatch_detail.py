import json, sys

with open(r'E:\Tina\自研背单词软件\mismatch_report.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

issues = data['issues']

# Check if adventure is in issues
for item in issues:
    word = item.get('word', '')
    if word.lower() == 'adventure':
        sys.stdout.buffer.write(json.dumps(item, ensure_ascii=False, indent=2).encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
        break
else:
    print("adventure NOT in mismatch_report")

# Show issue types
print("\n--- Issue types ---")
types = {}
for item in issues:
    t = item.get('issueType', item.get('type', 'unknown'))
    if t not in types:
        types[t] = 0
    types[t] += 1
for t, c in sorted(types.items(), key=lambda x: -x[1]):
    print(f"  {t}: {c}")

# Show first 3 issues
print("\n--- First 3 issues ---")
for item in issues[:3]:
    sys.stdout.buffer.write(json.dumps(item, ensure_ascii=False, indent=2).encode('utf-8'))
    sys.stdout.buffer.write(b'\n---\n')
