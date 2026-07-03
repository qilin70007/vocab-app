import pdfplumber
import os

base = r'E:\Tina'
count = 0
for root, dirs, files in os.walk(base):
    for f in files:
        if f.endswith('.pdf'):
            count += 1
            path = os.path.join(root, f)
            try:
                with pdfplumber.open(path) as pdf:
                    for i, page in enumerate(pdf.pages):
                        text = page.extract_text() or ""
                        if 'adventure' in text.lower():
                            safe = text.encode('ascii', 'replace').decode()
                            idx = text.lower().find('adventure')
                            print(f"FOUND in {f} page {i+1}:")
                            print(safe[max(0,idx-50):idx+200])
                            print("---")
            except Exception as e:
                pass

print(f"Done. Scanned {count} PDF files.")
