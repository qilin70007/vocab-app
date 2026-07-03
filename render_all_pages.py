"""
将 370 页扫描 PDF 渲染为高清 PNG 图片
用于后续 OCR / 视觉提取单词
"""
import fitz  # PyMuPDF
import os
import sys

PDF_PATH = r"E:\Tina\中考考纲\003-无水印 2026高清中考词汇小绿本+赠送+配套音频\无水印高清2026中考词汇小绿本3本\1. 26年初中英语考纲词汇用法手册（最新版）370页.pdf"
OUTPUT_DIR = r"E:\Tina\自研背单词软件\pdf_pages"

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    doc = fitz.open(PDF_PATH)
    total = len(doc)
    print(f"PDF total pages: {total}")
    
    for i in range(total):
        page = doc[i]
        # 高分辨率渲染，保证文字清晰可读
        pix = page.get_pixmap(dpi=250)
        out_path = os.path.join(OUTPUT_DIR, f"page_{i+1:04d}.png")
        pix.save(out_path)
        
        if (i + 1) % 10 == 0 or i == 0:
            size_kb = os.path.getsize(out_path) / 1024
            print(f"  Saved page {i+1}/{total}: {out_path} ({size_kb:.0f}KB)")
    
    doc.close()
    print(f"\nDone! Rendered {total} pages to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
