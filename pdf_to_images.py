"""
Convert scanned PDF pages to images using PyMuPDF (fitz).
Output: PNG images in output directory.
"""
import fitz  # PyMuPDF
import os
import sys

PDF_PATH = r"E:\Tina\中考考纲\003-无水印 2026高清中考词汇小绿本+赠送+配套音频\无水印高清2026中考词汇小绿本3本\1. 26年初中英语考纲词汇用法手册（最新版）370页.pdf"
OUTPUT_DIR = r"E:\Tina\自研背单词软件\pdf_pages"
START_PAGE = int(sys.argv[1]) if len(sys.argv) > 1 else 1
END_PAGE = int(sys.argv[2]) if len(sys.argv) > 2 else 10

os.makedirs(OUTPUT_DIR, exist_ok=True)

doc = fitz.open(PDF_PATH)
total_pages = doc.page_count
print(f"Total pages: {total_pages}")
print(f"Converting pages {START_PAGE} to {min(END_PAGE, total_pages)}...")

for page_num in range(START_PAGE - 1, min(END_PAGE, total_pages)):
    page = doc[page_num]
    # Render at 200 DPI for good OCR quality
    mat = fitz.Matrix(200/72, 200/72)
    pix = page.get_pixmap(matrix=mat)
    out_path = os.path.join(OUTPUT_DIR, f"page_{page_num + 1:04d}.png")
    pix.save(out_path)
    if page_num % 10 == 0 or page_num == END_PAGE - 1:
        print(f"  Page {page_num + 1}/{total_pages} saved ({os.path.getsize(out_path)} bytes)")

doc.close()
print("Done!")
