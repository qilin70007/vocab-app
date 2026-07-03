import json, sys

# Check various backup files for adventure
files_to_check = [
    'words_backup_1908.json',
    'words_backup_1449.json', 
    'words_backup_before_audit.json',
    'words_backup_before_mismatch_fix.json',
    'words_backup_before_15fix.json',
    'words_merged_v8.json',
    'words_merged_v7.json',
    'words_merged_v6.json',
    'words_enhanced.json',
    'final_words.json',
    'merged_words.json',
]

for fn in files_to_check:
    try:
        with open(f'E:\\Tina\\自研背单词软件\\{fn}', 'r', encoding='utf-8') as f:
            data = json.load(f)
        adv = [w for w in data if isinstance(w, dict) and w.get('word', '').lower() == 'adventure']
        if adv:
            ex = adv[0].get('examples', ['no examples'])[0]
            print(f"{fn}: {len(data)} entries, adventure examples: {json.dumps(adv[0].get('examples', []), ensure_ascii=False)[:200]}")
        else:
            print(f"{fn}: {len(data)} entries, adventure NOT FOUND")
    except Exception as e:
        print(f"{fn}: ERROR {e}")
