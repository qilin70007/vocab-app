import pdfplumber
import sys

pdf_path = r'E:\Tina\中考考纲\003-无水印 2026高清中考词汇小绿本+赠送+配套音频\9. 中考英语考纲词汇（详细版）.pdf'

print(f"Opening: {pdf_path}")
all_text = ""
with pdfplumber.open(pdf_path) as pdf:
    print(f"Total pages: {len(pdf.pages)}")
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ''
        all_text += f"\n===PAGE {i+1}===\n" + text

# Write with explicit UTF-8 (no BOM)
with open(r'E:\Tina\自研背单词软件\pdf_full_text_utf8.txt', 'w', encoding='utf-8', newline='') as f:
    f.write(all_text)
print(f"Saved {len(all_text)} chars to pdf_full_text_utf8.txt")

# Search for adventure
if 'adventure' in all_text.lower():
    idx = all_text.lower().find('adventure')
    page_start = all_text.rfind('===PAGE', 0, idx)
    page_end = all_text.find('===PAGE', idx)
    print("\n=== adventure context ===")
    sys.stdout.buffer.write(all_text[page_start:page_end].encode('utf-8', 'replace'))
    sys.stdout.buffer.write(b'\n')
else:
    print("adventure NOT found")
