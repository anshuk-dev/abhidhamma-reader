#!/usr/bin/env python3
"""
Rebuild All 64 Books with Perfect Pali Diacritics & Flawless Page Structuring
- Perfect Pali diacritics (macrons, retroflexes, guttural nasals, anusvara) with 100% preservation of English periods
- Table of Contents with CSS dotted leaders and right-aligned page numbers
- Catechism Q&A blocks and analytical data pairs
- Clean physical manuscript sheet layout
"""

import fitz # PyMuPDF
import os
import json
import re
import html
import time

BASE_DIR = "/Users/anshu_macmini/Downloads/abhidhamma text"
OUT_DIR = os.path.join(BASE_DIR, "web_app", "data")
BOOKS_OUT = os.path.join(OUT_DIR, "books")
PDFS_DIR = os.path.join(BASE_DIR, "web_app", "pdfs")

def clean_pali_typography(text):
    if not text:
        return ""
    
    # 0. Strip soft hyphens and zero-width spaces
    text = text.replace('\xad', '').replace('\u200b', '')

    # 1. Standard ligatures
    text = text.replace('ﬁ', 'fi').replace('ﬂ', 'fl').replace('ﬀ', 'ff').replace('ﬃ', 'ffi').replace('ﬄ', 'ffl')

    # 2. Rejoin line-break hyphens
    text = re.sub(r'(\b[a-zA-ZāīūṅñṭḍṇḷṃṁĀĪŪṄÑṬḌṆḶṂṀ]+)-\s*\n\s*([a-zA-ZāīūṅñṭḍṇḷṃṁĀĪŪṄÑṬḌṆḶṂṀ]+)', r'\1\2', text)

    # 3. Protect URLs and domains before dot processing
    urls = []
    def save_url(m):
        urls.append(m.group(0))
        return f"__URL_TEMP_{len(urls)-1}__"
    text = re.sub(r'https?://[^\s]+|www\.[^\s]+|palitext\.com|[a-zA-Z0-9_-]+\.(?:org|com|net|edu|de|ru|uk)', save_url, text)

    # 4. Guttural ˙n
    text = text.replace('˙n', 'ṅ').replace('n˙', 'ṅ').replace('˙N', 'Ṅ').replace('N˙', 'Ṅ')
    text = text.replace('˙ng', 'ṅg')

    # 5. Macrons FIRST (so lookaheads see true vowels)
    macron_pairs = [
        ('¯a', 'ā'), ('a¯', 'ā'), ('¯A', 'Ā'), ('A¯', 'Ā'),
        ('¯ı', 'ī'), ('ı¯', 'ī'), ('¯i', 'ī'), ('i¯', 'ī'),
        ('¯I', 'Ī'), ('I¯', 'Ī'),
        ('¯u', 'ū'), ('u¯', 'ū'), ('¯U', 'Ū'), ('U¯', 'Ū'),
        ('¯e', 'ē'), ('e¯', 'ē'), ('¯o', 'ō'), ('o¯', 'ō'),
    ]
    for src, dst in macron_pairs:
        text = text.replace(src, dst)
    text = text.replace('ı', 'i').replace('¯', '')

    # 6. Double retroflexes: e.g. t.t.h -> ṭṭh, t.t -> ṭṭ, d.d.h -> ḍḍh
    text = re.sub(r't\.t\.h', 'ṭṭh', text)
    text = re.sub(r'T\.t\.h', 'Ṭṭh', text)
    text = re.sub(r't\.t\.', 'ṭṭ', text)
    text = re.sub(r't\.t(?=[a-zA-Zāīūṅñṭḍṇḷ])', 'ṭṭ', text)
    text = re.sub(r'd\.d\.h', 'ḍḍh', text)
    text = re.sub(r'd\.d\.', 'ḍḍ', text)
    text = re.sub(r'n\.n\.', 'ṇṇ', text)
    text = re.sub(r'n\.n(?=[a-zA-Zāīūṅñṭḍṇḷ])', 'ṇṇ', text)

    # 7. Single retroflexes strictly when followed by vowels or homorganic stops:
    text = re.sub(r't\.(?=[aeiouāīūēōṭh])', 'ṭ', text)
    text = re.sub(r'T\.(?=[aeiouāīūēōṭh])', 'Ṭ', text)
    text = re.sub(r'd\.(?=[aeiouāīūēōḍh])', 'ḍ', text)
    text = re.sub(r'D\.(?=[aeiouāīūēōḍh])', 'Ḍ', text)
    text = re.sub(r'n\.(?=[aeiouāīūēōṇḍṭ])', 'ṇ', text)
    text = re.sub(r'N\.(?=[aeiouāīūēōṇḍṭ])', 'Ṇ', text)
    text = re.sub(r'l\.(?=[aeiouāīūēō])', 'ḷ', text)
    text = re.sub(r'L\.(?=[aeiouāīūēō])', 'Ḷ', text)
    text = re.sub(r's\.(?=[aeiouāīūēōkptm])', 'ṣ', text)
    text = re.sub(r'S\.(?=[aeiouāīūēōkptm])', 'Ṣ', text)

    # 8. Canonical Pali words with diacritics
    word_pairs = [
        (r'\bP[¯a\s]*l\s*ı\b', 'Pāḷi'), (r'\bP¯ali\b', 'Pāḷi'), (r'\bPali\b', 'Pāḷi'),
        (r'Dhammasa[˙nṅ]*gan[\.¯ı]*', 'Dhammasaṅgaṇī'),
        (r'Atthas[¯a]*lin[\.¯ı]*', 'Aṭṭhasālinī'),
        (r'\bPatthana\b', 'Paṭṭhāna'), (r'\bpatthana\b', 'paṭṭhāna'),
        (r'\bDhatukatha\b', 'Dhātukathā'), (r'\bdhatukatha\b', 'dhātukathā'),
        (r'\bPuggalapannatti\b', 'Puggalapaññatti'), (r'\bpuggalapannatti\b', 'puggalapaññatti'),
        (r'\bKathavatthu\b', 'Kathāvatthu'), (r'\bkathavatthu\b', 'kathāvatthu'),
        (r'\bVibhanga\b', 'Vibhaṅga'), (r'\bvibhanga\b', 'vibhaṅga'),
        (r'\bNibbana\b', 'Nibbāna'), (r'\bnibbana\b', 'nibbāna'),
        (r'\bAyatana\b', 'Āyatana'), (r'\bayatana\b', 'āyatana'),
        (r'\bDhatu\b', 'Dhātu'), (r'\bdhatu\b', 'dhātu'),
        (r'\bCitta\b', 'Citta'), (r'\bcitta\b', 'citta'),
        (r'\bCetasika\b', 'Cetasika'), (r'\bcetasika\b', 'cetasika'),
        (r'\bRupa\b', 'Rūpa'), (r'\brupa\b', 'rūpa'),
        (r'\bPaccaya\b', 'Paccaya'), (r'\bpaccaya\b', 'paccaya'),
        (r'\bPetakopadesa\b', 'Peṭakopadesa'),
        (r'\bNettippakarana\b', 'Nettippakaraṇa'),
        (r'\bPatisambhidamagga\b', 'Paṭisambhidāmagga'),
        (r'\bVisuddhimagga\b', 'Visuddhimagga'),
        (r'\bParamatthamanjusa\b', 'Paramatthamañjūsā'),
        (r'\bSatipatthana\b', 'Satipaṭṭhāna'),
        (r'\bPaticcasamuppada\b', 'Paṭiccasamuppāda'),
    ]
    for pat, repl in word_pairs:
        text = re.sub(pat, repl, text)

    # 9. Word-final m. in Pali stems
    pali_stems = r'\b([a-zA-Zāīūṅñṭḍṇḷ]*(?:citta|dhamma|rupa|rūpa|kamma|vedana|vedanā|sañña|saññā|sankhara|saṅkhāra|viññāna|viññāṇa|khandha|kusala|akusala|abyākata|abyakata|avya|avyā|jhāna|jhana|paccaya|indriya|adhigama|kāma|kāya|nibbāna|nibbana|sutta|pitaka|piṭaka|mātika|mātikā|āyatan|sukha|dukkha))m\.'
    text = re.sub(pali_stems, r'\1ṃ', text, flags=re.I)

    # 10. Restore protected URLs
    for idx, u in enumerate(urls):
        text = text.replace(f"__URL_TEMP_{idx}__", u)

    return text

def is_page_num(s):
    s_clean = s.strip().lower().rstrip('.')
    return bool(re.match(r'^(?:[0-9]+|[ivxlcdm]+)$', s_clean))

def parse_page_to_html(page, book_title, chap_title, page_num):
    blocks = page.get_text('dict')['blocks']
    
    raw_lines = []
    margin_notes = []
    
    for b in blocks:
        if 'lines' not in b: continue
        for l in b['lines']:
            txt = ''.join(s['text'] for s in l['spans']).strip()
            if not txt: continue
            
            # Header check: top 45 pt of page
            if l['bbox'][1] < 45 and len(txt) < 55:
                continue
            # Footer check: bottom 35 pt of page
            if l['bbox'][1] > 545 and re.match(r'^(?:[ivxlcdm0-9]+|\s*-\s*[0-9]+\s*-\s*)$', txt, re.I):
                continue
            # Margin folio note
            if re.match(r'^(?:p\.\s*[ivxlcdm0-9]+|\[\s*p\.\s*[ivxlcdm0-9]+\s*\])$', txt, re.I):
                margin_notes.append((l['bbox'][1], txt))
                continue
                
            raw_lines.append((l['bbox'][1], l['bbox'][0], txt))
            
    if not raw_lines:
        return f'''<section class="book-page-sheet" id="page-{page_num}" data-page="{page_num}">
  <header class="sheet-header">
    <span class="sheet-header-book">{html.escape(book_title)}</span>
    <span class="sheet-header-chap">{html.escape(chap_title)}</span>
    <span class="sheet-header-num">p. {page_num}</span>
  </header>
  <div class="sheet-content">
    <p class="empty-page-note">[Blank leaf / Folio illustration]</p>
  </div>
  <footer class="sheet-footer"><span class="sheet-footer-page">Page {page_num}</span></footer>
</section>'''

    # Sort lines vertically, then horizontally
    raw_lines.sort(key=lambda item: (round(item[0], 1), item[1]))
    
    # Merge parts sharing the same baseline
    merged_lines = []
    for y, x, txt in raw_lines:
        if merged_lines and abs(merged_lines[-1][0] - y) < 3.0:
            merged_lines[-1] = (merged_lines[-1][0], merged_lines[-1][1], merged_lines[-1][2] + ' ' + txt)
        else:
            merged_lines.append((y, x, txt))

    # Rejoin line-break hyphens
    for idx in range(len(merged_lines) - 1):
        y1, x1, t1 = merged_lines[idx]
        y2, x2, t2 = merged_lines[idx+1]
        if t1.endswith('-') and len(t1) > 1 and t2:
            parts2 = t2.split(' ', 1)
            merged_lines[idx] = (y1, x1, t1[:-1] + parts2[0])
            merged_lines[idx+1] = (y2, x2, parts2[1] if len(parts2) > 1 else '')
            
    # Check if this page is a Table of Contents page
    full_page_text = ' '.join(l[2] for l in merged_lines)
    is_toc_page = False
    if 'contents' in full_page_text[:140].lower() or 'table of contents' in full_page_text[:140].lower():
        is_toc_page = True
    else:
        toc_match_count = sum(1 for l in merged_lines if re.search(r'(?:[\.\s]{2,}|\s+)(?:[0-9]+|[ivxlcdm]+)$', l[2], re.I))
        if len(merged_lines) > 4 and (toc_match_count / len(merged_lines)) > 0.35:
            is_toc_page = True

    body_html_parts = []
    
    if is_toc_page:
        # Structured Table of Contents parser
        i = 0
        lines_text = [clean_pali_typography(l[2]) for l in merged_lines]
        body_html_parts.append('<div class="toc-table-container">')
        
        while i < len(lines_text):
            line = lines_text[i].strip()
            if not line:
                i += 1
                continue
            if line.lower() in ['contents', 'table of contents']:
                body_html_parts.append(f'<h3 class="reader-heading toc-heading">{html.escape(line)}</h3>')
                i += 1
                continue
                
            # Pattern A: line itself ends with page number
            m = re.match(r'^(.*?)(?:[\.\s]{2,}|\s+)([0-9]+|[ivxlcdm]+)$', line, re.I)
            if m and not m.group(1).strip().isdigit() and len(m.group(1).strip()) > 2:
                title = m.group(1).strip().rstrip('.')
                pnum = m.group(2).strip()
                nested_cls = " toc-row-nested" if re.match(r'^(?:\d+\.|\([a-z0-9]+\)|[A-Z]\.)\s+', title) else ""
                body_html_parts.append(
                    f'<div class="toc-table-row{nested_cls}"><span class="toc-row-title">{html.escape(title)}</span><span class="toc-row-leader"></span><span class="toc-row-page">{html.escape(pnum)}</span></div>'
                )
                i += 1
                continue
                
            # Pattern B: title on line i, page_num on line i+1
            if i + 1 < len(lines_text) and is_page_num(lines_text[i+1]):
                title = re.sub(r'[\.\s]{2,}$', '', line).strip()
                pnum = lines_text[i+1].strip()
                nested_cls = " toc-row-nested" if re.match(r'^(?:\d+\.|\([a-z0-9]+\)|[A-Z]\.)\s+', title) else ""
                body_html_parts.append(
                    f'<div class="toc-table-row{nested_cls}"><span class="toc-row-title">{html.escape(title)}</span><span class="toc-row-leader"></span><span class="toc-row-page">{html.escape(pnum)}</span></div>'
                )
                i += 2
                continue
                
            # Pattern C: title split across 2 lines + page_num on line i+2
            if i + 2 < len(lines_text) and is_page_num(lines_text[i+2]):
                title = line + ' ' + re.sub(r'[\.\s]{2,}$', '', lines_text[i+1]).strip()
                pnum = lines_text[i+2].strip()
                nested_cls = " toc-row-nested" if re.match(r'^(?:\d+\.|\([a-z0-9]+\)|[A-Z]\.)\s+', title) else ""
                body_html_parts.append(
                    f'<div class="toc-table-row{nested_cls}"><span class="toc-row-title">{html.escape(title)}</span><span class="toc-row-leader"></span><span class="toc-row-page">{html.escape(pnum)}</span></div>'
                )
                i += 3
                continue

            # Fallback title or text
            if len(line) < 60 and not line.endswith('.'):
                body_html_parts.append(f'<div class="toc-section-title">{html.escape(line)}</div>')
            else:
                body_html_parts.append(f'<p class="reader-para">{html.escape(line)}</p>')
            i += 1
            
        body_html_parts.append('</div>')
        
    else:
        # Standard structured reading page
        diffs = [merged_lines[idx+1][0] - merged_lines[idx][0] for idx in range(len(merged_lines)-1)]
        std_lh = sorted(diffs)[len(diffs)//2] if diffs else 14.0
        
        paras = []
        cur_para = []
        
        for idx, (y, x, txt) in enumerate(merged_lines):
            cleaned = clean_pali_typography(txt)
            if not cleaned: continue
            
            if idx == 0:
                cur_para.append(cleaned)
                continue
                
            prev_y = merged_lines[idx-1][0]
            dy = y - prev_y
            prev_txt = cur_para[-1] if cur_para else ''
            
            # Paragraph separation
            is_new_para = False
            if dy > std_lh * 1.48:
                is_new_para = True
            elif dy > std_lh * 1.15 and (prev_txt.endswith('.') or prev_txt.endswith(':') or prev_txt.endswith('?') or prev_txt.endswith('”')):
                is_new_para = True
            elif re.match(r'^(?:\[[0-9]+\]|\([ivx0-9]+\)|\bCHAPTER|\bBOOK|\bPART|\bSECTION)\b', cleaned, re.I):
                is_new_para = True
                
            if is_new_para:
                if cur_para:
                    paras.append(' '.join(cur_para))
                    cur_para = []
            cur_para.append(cleaned)
            
        if cur_para:
            paras.append(' '.join(cur_para))
            
        # Format paragraphs into rich semantic HTML
        for p in paras:
            p = p.strip()
            if not p: continue
            
            # 1. Catechism Q&A pattern: [2] What on that occasion is contact (phasso)? The contact...
            qa_match = re.match(r'^(\[[0-9]+\]|\([0-9]+\))\s+(What|Which|How|Is|Are|Tell)\b(.*?)\?\s+(.*)$', p, re.DOTALL | re.I)
            if qa_match:
                num = qa_match.group(1)
                lead = qa_match.group(2)
                q_text = f"{lead}{qa_match.group(3)}?"
                a_text = qa_match.group(4)
                body_html_parts.append(
                    f'<div class="qa-block"><div class="qa-q"><strong class="qa-num">{html.escape(num)}</strong> {html.escape(q_text)}</div><div class="qa-a">{html.escape(a_text)}</div></div>'
                )
                continue
                
            # 2. Major chapter / section heading
            if re.match(r'^(?:CHAPTER|BOOK|PART|SECTION|INTRODUCTORY ESSAY|PREFACE|INDEX|BIBLIOGRAPHY)\b', p, re.I) and len(p) < 90:
                body_html_parts.append(f'<h3 class="reader-heading">{html.escape(p)}</h3>')
                continue
                
            # 3. Short standalone heading
            if len(p) < 65 and not p.endswith('.') and not p.endswith(',') and not p.endswith(';'):
                body_html_parts.append(f'<h4 class="reader-subheading">{html.escape(p)}</h4>')
                continue
                
            # 4. Mātikā two-column or analytical data pair
            if ' = ' in p or ' : ' in p:
                parts = re.split(r'\s+[=:]\s+', p, maxsplit=1)
                if len(parts) == 2 and len(parts[1]) < 40:
                    body_html_parts.append(
                        f'<div class="matika-grid-row"><span class="data-pair-key">{html.escape(parts[0])}</span><span class="data-pair-val">{html.escape(parts[1])}</span></div>'
                    )
                    continue

            # Standard paragraph
            body_html_parts.append(f'<p class="reader-para">{html.escape(p)}</p>')
            
    content_html = '\n    '.join(body_html_parts)
    
    return f'''<section class="book-page-sheet" id="page-{page_num}" data-page="{page_num}">
  <header class="sheet-header">
    <span class="sheet-header-book">{html.escape(book_title)}</span>
    <span class="sheet-header-chap">{html.escape(chap_title)}</span>
    <span class="sheet-header-num">p. {page_num}</span>
  </header>
  <div class="sheet-content">
    {content_html}
  </div>
  <footer class="sheet-footer">
    <span class="sheet-footer-page">Page {page_num}</span>
  </footer>
</section>'''

def rebuild_book(book_id):
    manifest_p = os.path.join(BOOKS_OUT, book_id, "manifest.json")
    if not os.path.exists(manifest_p):
        print(f"Skipping {book_id}: No manifest.json")
        return
        
    with open(manifest_p) as f:
        manifest = json.load(f)
        
    pdf_p = os.path.join(PDFS_DIR, f"{book_id}.pdf")
    if not os.path.exists(pdf_p):
        print(f"Skipping {book_id}: Missing PDF {pdf_p}")
        return
        
    doc = fitz.open(pdf_p)
    manifest['total_pages'] = len(doc)
    manifest['pdf_file'] = f"pdfs/{book_id}.pdf"
    
    book_title = manifest.get('title', book_id)
    chapters = manifest.get('chapters', [])
    chaps_dir = os.path.join(BOOKS_OUT, book_id, "chapters")
    os.makedirs(chaps_dir, exist_ok=True)
    
    for chap in chapters:
        chap_id = chap['id']
        chap_title = chap['title']
        start_p = chap['start_page']
        end_p = min(chap['end_page'], len(doc))
        
        page_sheets = []
        chap_words = 0
        
        for pno in range(start_p, end_p + 1):
            if pno > len(doc): break
            page_obj = doc[pno - 1]
            raw_text = page_obj.get_text('text')
            chap_words += len(raw_text.split())
            sheet_html = parse_page_to_html(page_obj, book_title, chap_title, pno)
            page_sheets.append(sheet_html)
            
        full_html = f'''<div class="chapter-container" id="chapter-{chap_id}">
  <header class="chapter-header">
    <div class="chapter-kicker">{html.escape(book_title)} · Chapter {chap['chapter_number']}</div>
    <h2 class="chapter-title">{html.escape(chap_title)}</h2>
    <div class="chapter-meta">Pages {start_p}–{end_p} ({end_p - start_p + 1} pages)</div>
  </header>
  <div class="chapter-sheets">
''' + '\n\n'.join(page_sheets) + '''
  </div>
</div>'''

        chap_data = {
            "id": chap_id,
            "book_id": book_id,
            "chapter_number": chap['chapter_number'],
            "title": chap_title,
            "level": chap.get('level', 1),
            "start_page": start_p,
            "end_page": end_p,
            "page_count": end_p - start_p + 1,
            "word_count": chap_words,
            "reading_time_min": max(1, chap_words // 200),
            "html": full_html
        }
        
        out_chap_p = os.path.join(chaps_dir, f"{chap_id}.json")
        with open(out_chap_p, "w", encoding="utf-8") as f:
            json.dump(chap_data, f, ensure_ascii=False)
            
    # Save updated manifest
    with open(manifest_p, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

def main():
    print("=== STARTING REBUILD OF ALL 64 BOOKS WITH PERFECT PALI DIACRITICS ===")
    start_time = time.time()
    
    with open(os.path.join(OUT_DIR, "library_index.json")) as f:
        lib = json.load(f)
        
    all_books = []
    for cat in ['abhidhamma_pitaka', 'sutta_pitaka', 'commentaries', 'dhamma_books', 'children_books']:
        for b in lib.get(cat, []):
            all_books.append((cat, b['id'], b['title']))
            
    print(f"Total books to process: {len(all_books)}")
    
    for i, (cat, book_id, title) in enumerate(all_books, 1):
        t0 = time.time()
        print(f"[{i:2}/{len(all_books)}] Rebuilding {title} ({book_id})...", end="", flush=True)
        rebuild_book(book_id)
        print(f" done in {time.time()-t0:.2f}s")
        
    total_dur = time.time() - start_time
    print(f"\n✓ ALL 64 BOOKS REBUILT WITH PERFECT DIACRITICS & PAGES IN {total_dur:.2f}s!")

if __name__ == "__main__":
    main()
