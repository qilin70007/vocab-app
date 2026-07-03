import json, re, sys

# Load words.json
with open(r'E:\Tina\自研背单词软件\words.json', 'r', encoding='utf-8') as f:
    words = json.load(f)

# Get A section words in order
a_words_json = []
for w in words:
    if w.get('section') == 'A':
        a_words_json.append((w.get('number'), w.get('word')))

# Load PDF text
with open(r'E:\Tina\自研背单词软件\pdf_full_text.txt', 'r', encoding='utf-8') as f:
    pdf_text = f.read()

# Extract word entries from PDF - they look like: word [phonetic] pos meaning
# Pattern: word at start of line followed by [ or space
# Let's find all headwords in the A section
# PDF format: "able ['eibl] adj." or "about ['əbaʊt]prep."
lines = pdf_text.split('\n')
a_section = False
pdf_words = []
for line in lines:
    line = line.strip()
    if line == 'A':
        a_section = True
        continue
    if line == 'B':
        a_section = False
        break
    if a_section:
        # Try to extract headword
        # Pattern: word [phonetic] or word phonetic
        m = re.match(r"^([a-zA-Z][a-zA-Z\-']*)\s*\[", line)
        if m:
            pdf_words.append(m.group(1).lower())
        else:
            # Some entries might not have phonetics
            m2 = re.match(r"^([a-zA-Z][a-zA-Z\-']*)\s+[a-z]", line)
            if m2 and len(m2.group(1)) > 1:
                pdf_words.append(m2.group(1).lower())

# Output
out = []
out.append(f"words.json A section: {len(a_words_json)} words")
out.append(f"PDF A section: {len(pdf_words)} words")
out.append("")

json_set = set(w.lower() for _, w in a_words_json)
pdf_set = set(pdf_words)

in_json_not_pdf = sorted(json_set - pdf_set)
in_pdf_not_json = sorted(pdf_set - json_set)

out.append(f"In words.json but NOT in PDF ({len(in_json_not_pdf)}):")
for w in in_json_not_pdf:
    out.append(f"  {w}")

out.append("")
out.append(f"In PDF but NOT in words.json ({len(in_pdf_not_json)}):")
for w in in_pdf_not_json:
    out.append(f"  {w}")

sys.stdout.buffer.write('\n'.join(out).encode('utf-8'))
