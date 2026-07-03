import json, sys

# Check the 15fix backup  
for fn in ['words_backup_before_15fix.json', 'words_backup_before_mismatch_fix.json']:
    try:
        with open(f'E:\\Tina\\自研背单词软件\\{fn}', 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"\n{fn}: {len(data)} entries")
        adv = [w for w in data if isinstance(w, dict) and w.get('word', '').lower() == 'adventure']
        if adv:
            sys.stdout.buffer.write(json.dumps(adv[0], ensure_ascii=False, indent=2).encode('utf-8'))
            sys.stdout.buffer.write(b'\n')
        else:
            print("  adventure NOT FOUND")
    except Exception as e:
        print(f"{fn}: ERROR {e}")
