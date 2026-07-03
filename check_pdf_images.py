import pdfplumber

pdf_path = r'E:\Tina\中考考纲\003-无水印 2026高清中考词汇小绿本+赠送+配套音频\9. 中考英语考纲词汇（详细版）.pdf'

with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text() or ""
        images = page.images
        if images:
            print(f"Page {i+1}: {len(images)} images, {len(text)} chars text")
        if i < 5:
            safe = text[:100].encode('ascii', 'replace').decode()
            print(f"  Page {i+1} text preview: {safe}")
