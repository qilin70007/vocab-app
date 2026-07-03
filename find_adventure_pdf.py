import os, sys, glob

# Find all PDFs that might contain "adventure"
pdf_files = []
for root, dirs, files in os.walk(r'E:\Tina'):
    for f in files:
        if f.lower().endswith('.pdf'):
            full = os.path.join(root, f)
            try:
                size = os.path.getsize(full)
                if size < 100*1024*1024:  # < 100MB
                    pdf_files.append(full)
            except:
                pass

print(f"Found {len(pdf_files)} PDFs to scan")

# Try a quick search by extracting first 5 pages of each and looking for "adventure"
matches = []
for i, pdf in enumerate(pdf_files):
    if i % 20 == 0:
        print(f"  Scanning {i}/{len(pdf_files)}...")
    try:
        import pdfplumber
        with pdfplumber.open(pdf) as p:
            for page in p.pages:
                text = page.extract_text() or ''
                if 'adventure' in text.lower():
                    matches.append((pdf, len(text)))
                    break
    except Exception as e:
        pass

print(f"\nPDFs containing 'adventure': {len(matches)}")
for m in matches:
    print(f"  {m[0]}")
