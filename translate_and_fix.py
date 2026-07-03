import json
import re
import time
import sys

from deep_translator import GoogleTranslator

END_CHARS = "'.!?"

def clean_sentence(text):
    if not text or not isinstance(text, str):
        return text
    original = text

    text = re.sub(r'\s+Rd\s+\d[A-Z]\s+[A-Z]\s+[A-Z]\s*$', '', text)
    text = re.sub(r'\s+&\s*%\s+[\d\W]+\s*$', '', text)
    text = re.sub(r'\s+&\s*%\s*[/\\[\],\-\s]+\s*$', '', text)
    text = re.sub(r'\s+&\s*%\s+\-\s*$', '', text)
    text = re.sub(r'\s+&\s*%\s*,{1,2}\s*$', '', text)
    text = re.sub(r'\s+&\s*%\s+\d+\s*$', '', text)
    text = re.sub(r'\s+_[a-z]+\.?\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+[a-z]+\.?\s*$', '', text)
    text = re.sub(r'\s+(gas|lead|learn|hug|PLUS|pleasure|true|tiny|stick|tap|wash|wipe|stupid|spare|tin|rich|sat|remain|shore|radio|rat|pub|cone)\.?\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+_[a-z]+\.。?\s*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+4\s*Fil\s+\d+\s+T\s+"[^"]*"\s*$', '', text)
    text = re.sub(r'\s+\+\d+\s*F\s+[A-Za-z]+\s+wy\s+\d+k,?\s*$', '', text)
    text = re.sub(r'\s+\d+b\s*$', '', text)
    text = re.sub(r'\s+\d+\+\s*$', '', text)
    text = re.sub(r'\s+\d+\s*$', '', text)
    text = re.sub(r'\s+4e=\s*$', '', text)
    text = re.sub(r'\s+4S\s+\+h4\s*$', '', text)
    text = re.sub(r'\s+tu\s+\d+/]\s*$', '', text)
    text = re.sub(r'\s+\+\d+\s+[A-Z]\s*$', '', text)
    text = re.sub(r'\s+\|\s+\d+:\s*$', '', text)
    text = re.sub(r'\s+\{\|\s+\d+[a-z];\s*$', '', text)
    text = re.sub(r'\s+\{\|\s+\d+:\s*$', '', text)
    text = re.sub(r'\s+Hi\s*$', '', text)
    text = re.sub(r'\s+9\s*$', '', text)
    text = re.sub(r'\s+ee\s*$', '', text)
    text = re.sub(r'\s+Hs\s*$', '', text)
    text = re.sub(r'\s+\d+\)\s*$', '', text)
    text = re.sub(r'\s+Afan;\s+A\s+Afabey\s*$', '', text)
    text = re.sub(r'\s+Bi\s*$', '', text)
    text = re.sub(r'\s+\(V\(X;\s+falAih;\s+A\s*$', '', text)
    text = re.sub(r'\s+Bx\s*$', '', text)
    text = re.sub(r'\s+3&f\s*$', '', text)
    text = re.sub(r'\s+2!\)\s+4b\s*$', '', text)
    text = re.sub(r'\s+\*h22tH3E\s+;\s+\*tBe2#\s*$', '', text)
    text = re.sub(r'\s+\+\d+tH\s*$', '', text)
    text = re.sub(r'\s+\(4\s+humans\)\s*$', '', text)
    text = re.sub(r'\s+\(= human being\)\s*$', '', text)
    text = re.sub(r'\s+Hat;\s+\d+a\s*$', '', text)
    text = re.sub(r'\s+inffi;\s+in\s*$', '', text)
    text = re.sub(r'\s+A2K\s*$', '', text)
    text = re.sub(r'\s+Rah\)\s*$', '', text)
    text = re.sub(r"\s+o'clock\.\s*$", '', text)
    text = re.sub(r'\s+22th\s*$', '', text)
    text = re.sub(r'\s+\d+\s*$', '', text)
    text = re.sub(r'\s+\([^)]{0,5}\s*$', '', text)
    text = re.sub(r'^ee\s+', '', text)
    text = re.sub(r'\s{2,}', ' ', text).strip()

    return text.strip()


def translate_text(text, max_retries=3):
    if not text:
        return text
    for attempt in range(max_retries):
        try:
            translator = GoogleTranslator(source='en', target='zh-CN')
            result = translator.translate(text)
            time.sleep(0.4)
            return result
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2 * (attempt + 1))
            else:
                print("  Translation failed for: " + text[:50] + "... -> " + str(e), file=sys.stderr)
                return None
    return None


def main():
    with open(r'E:\Tina\自研背单词软件\no_zh_remaining.json', 'r', encoding='utf-8') as f:
        to_translate = json.load(f)

    print("Loaded " + str(len(to_translate)) + " entries to translate")

    translations = {}
    skipped = []

    for i, item in enumerate(to_translate):
        num = item['num']
        exIdx = item['exIdx']
        example = item['example']

        print("[" + str(i+1) + "/" + str(len(to_translate)) + "] #" + str(num) + "[" + str(exIdx) + "] " + example[:60])

        # Skip POS-only entries
        if re.match(r'^[a-z]+\s+(n\.|v\.|adj\.|adv\.|pron\.|prep\.|conj\.|int\.)\s*$', example.strip()):
            print("  SKIP (POS label only): " + example)
            skipped.append((num, exIdx))
            translations[(num, exIdx)] = example
            continue

        cleaned = clean_sentence(example)
        if cleaned != example:
            print("  Cleaned: " + cleaned[:60])

        if len(cleaned.strip()) < 5:
            print("  SKIP (too short after cleaning): " + cleaned)
            skipped.append((num, exIdx))
            translations[(num, exIdx)] = cleaned
            continue

        zh = translate_text(cleaned)
        if zh:
            translations[(num, exIdx)] = (cleaned, zh)
            print("  -> " + zh)
        else:
            zh2 = translate_text(example)
            if zh2:
                translations[(num, exIdx)] = (example, zh2)
                print("  -> " + zh2 + " (original)")
            else:
                translations[(num, exIdx)] = (cleaned, None)
                print("  FAILED to translate")

    print("\nTranslation done. " + str(len(skipped)) + " entries skipped.")

    with open(r'E:\Tina\自研背单词软件\words.json', 'r', encoding='utf-8') as f:
        words_data = json.load(f)

    print("Loaded " + str(len(words_data)) + " words")

    word_index = {}
    for w in words_data:
        word_index[w['number']] = w

    fixed_count = 0
    failed_count = 0

    for num, exIdx in translations:
        if num not in word_index:
            print("WARNING: word number " + str(num) + " not found in words.json")
            continue

        word_obj = word_index[num]
        examples = word_obj.get('examples', [])

        if exIdx >= len(examples):
            print("WARNING: exIdx " + str(exIdx) + " out of range for word " + str(num) + " '" + word_obj.get('word') + "' (only " + str(len(examples)) + " examples)")
            continue

        result = translations[(num, exIdx)]

        if isinstance(result, tuple):
            en_part, zh_part = result
            if zh_part:
                new_example = en_part + ' ' + zh_part
                examples[exIdx] = new_example
                fixed_count += 1
            else:
                failed_count += 1

    print("\nUpdated words.json: " + str(fixed_count) + " examples fixed, " + str(failed_count) + " failed translations")

    with open(r'E:\Tina\自研背单词软件\words.json', 'w', encoding='utf-8') as f:
        json.dump(words_data, f, ensure_ascii=False, indent=2)

    print("Saved words.json")

    with open(r'E:\Tina\自研背单词软件\words.json', 'r', encoding='utf-8') as f:
        verify = json.load(f)
    print("Word count verified: " + str(len(verify)))

    return fixed_count, failed_count


if __name__ == '__main__':
    fixed, failed = main()
    print("\nDONE: " + str(fixed) + " examples fixed, " + str(failed) + " failed")
