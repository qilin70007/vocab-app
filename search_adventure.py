import pdfplumber
import os
import sys

base = r'E:\Tina\中考考纲'
for root, dirs, files in os.walk(base):
    for f in files:
        if f.endswith('.pdf'):
            path = os.path.join(root, f)
            try:
                with pdfplumber.open(path) as pdf:
                    for i, page in enumerate(pdf.pages):
                        text = page.extract_text() or ""
                        if 'adventure' in text.lower():
                            print(f"FOUND in {f} page {i+1}")
                            idx = text.lower().find('adventure')
                            print(text[max(0,idx-50):idx+200])
            except Exception as e:
                pass  # skip problematic PDFs

print("Done searching all PDFs")
