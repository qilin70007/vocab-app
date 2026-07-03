import json, sys

with open(r'E:\Tina\自研背单词软件\mismatch_report.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

if isinstance(data, list):
    print(f"Total mismatches: {len(data)}")
    for item in data[:5]:
        sys.stdout.buffer.write(json.dumps(item, ensure_ascii=False, indent=2).encode('utf-8'))
        sys.stdout.buffer.write(b'\n---\n')
elif isinstance(data, dict):
    print(f"Keys: {list(data.keys())}")
    for k, v in data.items():
        if isinstance(v, list):
            print(f"  {k}: {len(v)} items")
        else:
            print(f"  {k}: {v}")
