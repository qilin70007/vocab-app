import pdfplumber, sys, re

pdf_path = r'E:\Tina\中考考纲\003-无水印 2026高清中考词汇小绿本+赠送+配套音频\无水印高清2026中考词汇小绿本3本\1. 26年初中英语考纲词汇用法手册（最新版）370页.pdf'

found_pages = []
with pdfplumber.open(pdf_path) as pdf:
    total = len(pdf.pages)
    print(f"Total pages: {total}")
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ''
        if 'adventure' in text.lower():
            found_pages.append(i)
            # Print a snippet around 'adventure'
            idx = text.lower().find('adventure')
            start = max(0, idx - 100)
            end = min(len(text), idx + 300)
            snippet = text[start:end]
            sys.stdout.buffer.write(f"\n=== Page {i+1} ===\n".encode('utf-8'))
            sys.stdout.buffer.write(snippet.encode('utf-8', 'replace'))
            sys.stdout.buffer.write(b'\n')

if not found_pages:
    print("adventure NOT found in this PDF")
else:
    print(f"\nFound on pages: {[p+1 for p in found_pages]}")
