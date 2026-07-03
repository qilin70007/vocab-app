import fitz
import os

pdf_path = r"E:\Tina\中考英语资料\1. 26年初中英语考纲词汇用法手册（最新版）370页.pdf"
output_dir = r"E:\Tina\自研背单词软件\pdf_pages"
os.makedirs(output_dir, exist_ok=True)

doc = fitz.open(pdf_path)
print(f"Total pages: {doc.page_count}")

# Render pages 1-20 at 200 DPI for inspection
for i in range(min(20, doc.page_count)):
    page = doc[i]
    pix = page.get_pixmap(dpi=200)
    out_path = os.path.join(output_dir, f"page_{i+1:04d}.png")
    pix.save(out_path)
    print(f"Saved page {i+1}: {out_path} ({os.path.getsize(out_path)} bytes)")

doc.close()
print("Done rendering first 20 pages")
