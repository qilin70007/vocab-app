"""
用 g2p-en 生成缺失的IPA音标
g2p-en 将英文文本转换为ARPAbet音素，再转成IPA
"""
import json
import sys
import os

# 加载words
with open('E:/Tina/自研背单词软件/words_merged.json', 'r', encoding='utf-8') as f:
    words = json.load(f)

# ARPAbet to IPA 映射
arpabet_to_ipa = {
    'AA': 'ɑː', 'AE': 'æ', 'AH': 'ə', 'AO': 'ɔː', 'AW': 'aʊ',
    'AY': 'aɪ', 'EH': 'e', 'ER': 'əː', 'EY': 'eɪ', 'IH': 'ɪ',
    'IY': 'iː', 'OW': 'oʊ', 'OY': 'ɔɪ', 'UH': 'ʊ', 'UW': 'uː',
    'B': 'b', 'CH': 'tʃ', 'D': 'd', 'DH': 'ð', 'F': 'f',
    'G': 'ɡ', 'HH': 'h', 'JH': 'dʒ', 'K': 'k', 'L': 'l',
    'M': 'm', 'N': 'n', 'NG': 'ŋ', 'P': 'p', 'R': 'r',
    'S': 's', 'SH': 'ʃ', 'T': 't', 'TH': 'θ', 'V': 'v',
    'W': 'w', 'Y': 'j', 'Z': 'z', 'ZH': 'ʒ'
}

def has_ipa(phon):
    if not phon:
        return False
    return bool(any(c in phon for c in 'əːˈˌæɪɒɑʊɛɔɪʌθðʃʒŋ'))

def arpabet_to_ipa_str(arpabet_list):
    """将ARPAbet音素列表转为IPA字符串"""
    ipa_parts = []
    for i, phoneme in enumerate(arpabet_list):
        # 分离重音标记
        stress = ''
        if phoneme[-1] in '012':
            stress_num = int(phoneme[-1])
            phoneme_base = phoneme[:-1]
            if stress_num == 1:
                stress = 'ˈ'
            elif stress_num == 2:
                stress = 'ˌ'
        else:
            phoneme_base = phoneme
        
        ipa = arpabet_to_ipa.get(phoneme_base, phoneme_base)
        ipa_parts.append(stress + ipa)
    
    return '/' + ''.join(ipa_parts) + '/'

# 检查需要修复的词
need_fix = [w for w in words if not has_ipa(w.get('phonetic', ''))]
print(f"需要修复: {len(need_fix)} 个词")

try:
    from g2p_en import G2p
    g2p = G2p()
    
    fixed = 0
    failed = 0
    
    for i, w in enumerate(need_fix):
        word = w['word']
        try:
            arpabet = g2p(word)
            # 过滤空格和标点
            arpabet = [p for p in arpabet if p in arpabet_to_ipa or (p[:-1] in arpabet_to_ipa and p[-1] in '012')]
            if arpabet:
                ipa = arpabet_to_ipa_str(arpabet)
                w['phonetic'] = ipa
                fixed += 1
            else:
                failed += 1
        except Exception as e:
            failed += 1
        
        if (i + 1) % 100 == 0:
            print(f"进度: {i+1}/{len(need_fix)} (修复: {fixed}, 失败: {failed})")
    
    print(f"\n修复完成: {fixed} 成功, {failed} 失败")
    
    # 验证
    still_bad = [w for w in words if not has_ipa(w.get('phonetic', ''))]
    print(f"仍无IPA音标: {len(still_bad)}")
    if still_bad:
        print("前10个:", ', '.join(f"{w['word']}({w.get('phonetic','')})" for w in still_bad[:10]))
    
    # 保存
    with open('E:/Tina/自研背单词软件/words_merged.json', 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)
    print("已保存: words_merged.json")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
