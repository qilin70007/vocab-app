import pdfplumber
import json
import re
import sys
import os

pdf_path = r'E:\Tina\中考考纲\003-无水印 2026高清中考词汇小绿本+赠送+配套音频\无水印高清2026中考词汇小绿本3本\1. 26年初中英语考纲词汇用法手册（最新版）370页.pdf'

print(f"Extracting {pdf_path}...")
all_text = ""
with pdfplumber.open(pdf_path) as pdf:
    total = len(pdf.pages)
    print(f"Total pages: {total}")
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ''
        all_text += f"\n===PAGE {i+1}===\n" + text
        if (i+1) % 50 == 0:
            print(f"  Extracted {i+1}/{total} pages...")

out_path = r'E:\Tina\自研背单词软件\handbook_full_text.txt'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(all_text)
print(f"Saved to {out_path}, {len(all_text)} chars")

# Check for adventure
if 'adventure' in all_text.lower():
    idx = all_text.lower().find('adventure')
    page_start = all_text.rfind('===PAGE', 0, idx)
    page_end = all_text.find('===PAGE', idx)
    page_block = all_text[page_start:page_end]
    print("\n=== adventure context ===")
    sys.stdout.buffer.write(page_block.encode('utf-8', 'replace'))
    sys.stdout.buffer.write(b'\n')
else:
    print("adventure NOT found in this handbook")
