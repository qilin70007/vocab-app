import pdfplumber
import sys, glob

pattern = r'E:\Tina\中考考纲\003-无水印 2026高清中考词汇小绿本+赠送+配套音频\无水印高清2026中考词汇小绿本3本\赠--默写沪教版上海市初中英语教材*'
files = glob.glob(pattern)
print(f"Found: {files}")
if not files:
    print("No file found")
    sys.exit(1)

pdf_path = files[0]
print(f"Opening: {pdf_path}")
all_text = ""
with pdfplumber.open(pdf_path) as pdf:
    print(f"Total pages: {len(pdf.pages)}")
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ''
        all_text += f"\n===PAGE {i+1}===\n" + text

with open(r'E:\Tina\自研背单词软件\textbook_vocab.txt', 'w', encoding='utf-8') as f:
    f.write(all_text)
print(f"Saved {len(all_text)} chars")

if 'adventure' in all_text.lower():
    idx = all_text.lower().find('adventure')
    page_start = all_text.rfind('===PAGE', 0, idx)
    page_end = all_text.find('===PAGE', idx)
    print("\n=== adventure context ===")
    sys.stdout.buffer.write(all_text[page_start:page_end].encode('utf-8', 'replace'))
    sys.stdout.buffer.write(b'\n')
else:
    print("adventure NOT found")
