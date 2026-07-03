import pdfplumber
import json
import sys

pdf_path = r'E:\Tina\中考考纲\003-无水印 2026高清中考词汇小绿本+赠送+配套音频\9. 中考英语考纲词汇（详细版）.pdf'
output_path = r'E:\Tina\自研背单词软件\pdf_full_text.txt'

with pdfplumber.open(pdf_path) as pdf:
    print(f"Total pages: {len(pdf.pages)}")
    all_text = []
    for i, page in enumerate(pdf.pages):
        text = page.extract_text()
        if text:
            all_text.append(f"=== Page {i+1} ===\n{text}")
        if (i+1) % 10 == 0:
            print(f"Processed {i+1}/{len(pdf.pages)} pages")
    
    full_text = "\n\n".join(all_text)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(full_text)
    print(f"Extracted {len(full_text)} chars to {output_path}")
    
    # Search for adventure
    idx = full_text.lower().find('adventure')
    if idx >= 0:
        print(f"\nFound 'adventure' at index {idx}:")
        print(full_text[max(0,idx-100):idx+200])
    else:
        print("\n'adventure' not found in PDF text")
