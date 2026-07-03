import json

with open(r'E:\Tina\自研背单词软件\no_zh_remaining.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open(r'E:\Tina\自研背单词软件\examples_list.txt', 'w', encoding='utf-8') as out:
    for i, item in enumerate(data):
        out.write(f"{i}|{item['num']}|{item['exIdx']}|{item['example']}\n")

print(f"Written {len(data)} entries to examples_list.txt")
