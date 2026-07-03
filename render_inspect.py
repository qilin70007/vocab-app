# -*- coding: utf-8 -*-
import fitz
import os
import sys

pdf_path = r"E:\Tina\中考考纲\003-无水印 2026高清中考词汇小绿本+赠送+配套音频\无水印高清2026中考词汇小绿本3本\1. 26年初中英语考纲词汇用法手册（最新版）370页.pdf"
output_dir = r"E:\Tina\自研背单词软件\pdf_pages"
os.makedirs(output_dir, exist_ok=True)

doc = fitz.open(pdf_path)
print(f"Total pages: {doc.page_count}")

# Render pages 1-25 at 200 DPI for inspection
for i in range(min(25, doc.page_count)):
    page = doc[i]
    pix = page.get_pixmap(dpi=200)
    out_path = os.path.join(output_dir, f"inspect_{i+1:04d}.png")
    pix.save(out_path)
    print(f"Saved page {i+1}: {out_path} ({os.path.getsize(out_path)} bytes)")

doc.close()
print("Done rendering first 25 pages for inspection")
