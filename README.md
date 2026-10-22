# ☸️ Abhidhamma Reader (Web & Mobile HTML Reader)

A minimalist, high-performance, distraction-free HTML reader for ancient Theravada Buddhist texts, starting with **all Seven Books of the Abhidhamma Piṭaka** (all 8 canonical volumes: 4,839 pages, 1,428,677 words) and cataloging the entire 64-book library.

---

## 🌐 Live Online Reader (Direct Link)

👉 **[https://anshuk-dev.github.io/abhidhamma-reader/](https://anshuk-dev.github.io/abhidhamma-reader/)**

*Open this link on your phone, tablet, or computer to read with all interactive themes, typography controls, and full-text search.*

---

## 💻 Local Reading (Mac / PC)
Run the reader locally with one command:

```bash
./launch_reader.sh
# or
python3 server.py
```

This will automatically launch the server and open your browser at **`http://localhost:8088`**.

---

### Option 3: Deploy to Free Cloudflare Pages / Vercel (For 24/7 Mobile Reading)
If you want a permanent link like `https://abhidhamma.pages.dev` on your phone without running anything locally:
1. Log in to [Cloudflare Pages](https://pages.cloudflare.com/) or [Vercel](https://vercel.com/) (both are 100% free).
2. Connect your GitHub account (`anshuk-dev`).
3. Select this private repository `abhidhamma-reader`, set the Root directory to `web_app`, and click **Deploy**.
4. You will get a permanent private/public URL to read anytime anywhere.

---

## 🏛️ Architecture & Content Pipeline

```text
abhidhamma text/
├── launch_reader.sh              # 1-click launcher for macOS/Linux
├── server.py                     # Lightweight Python static server
├── web_app/                      # Complete web application
│   ├── index.html                # Responsive reader app (Desktop + Mobile)
│   ├── style.css                 # 4 Soft themes, typography & responsive layout
│   ├── app.js                    # SPA reading engine, settings, drawer, search, persistence
│   └── data/
│       ├── library_index.json    # Complete catalog (64 books, all categories)
│       └── books/                # Extracted JSON chapters & manifests
│           ├── dhammasangani/    # 30 chapters, 485 pages
│           ├── vibhanga/         # 26 chapters, 699 pages
│           ├── dhatukatha/       # 21 chapters, 213 pages
│           ├── puggalapannatti/  # 15 chapters, 136 pages
│           ├── kathavatthu/      # 29 chapters, 564 pages
│           ├── yamaka/           # 176 chapters, 1,260 pages
│           ├── patthana_vol1/    # 14 chapters, 700 pages
│           └── patthana_vol2/    # 27 chapters, 782 pages
└── Abhidhamma_Pitaka_Seven_Books/ # Original canonical PDFs organized into 7 folders
    ├── Book_1_Dhammasangani/
    ├── Book_2_Vibhanga/
    ├── Book_3_Dhatukatha/
    ├── Book_4_Puggalapannatti/
    ├── Book_5_Kathavatthu/
    ├── Book_6_Yamaka/
    └── Book_7_Patthana/
```

---

## 🎨 Design & Features

### 1. Four Calibrated Soft Color Themes
Designed specifically to eliminate eye strain during deep study:
* **Paper (Default)**: Soft warm alabaster (`#FAF7F2`), ink slate (`#272727`), warm monastic accents.
* **Sepia**: Aged parchment tone (`#F3EBDD`), espresso ink (`#34281E`), gentle ambient contrast.
* **Sage**: Calming misty mint green (`#EBF1EB`), deep pine ink (`#1C2B20`), restful for the eyes.
* **Night (Obsidian)**: Velvet charcoal (`#141618`), misty silver typography (`#D6DCE2`), zero glare for nighttime reading.

### 2. Typography & Layout Controls
* **Font Styles**:
  * *Literary Serif* (`Newsreader` / `Charter` / `Georgia`)
  * *Clean Modern Sans* (`Inter` / system-ui)
  * *Monospace / Scholar* (`SF Mono` / `Menlo`)
* **Font Size**: Adjustable from `14px` to `32px` with stepper buttons and display.
* **Line Spacing**: Compact (`1.5`), Normal (`1.8`), Relaxed (`2.2`).
* **Reader Width**: Narrow (`620px`), Balanced (`760px`), Wide (`960px`).
* **Alignment**: Left-aligned (ragged right) or Justified with hyphenation.
* **Page Badges**: Toggle on/off the original print page number markers `[Page N]`.

### 3. Mobile First & Desktop Experience
* **Mobile View**: Collapsible slide-in navigation drawer, bottom touch controls (Prev, Next, Chapters TOC, Theme switcher, progress badge), edge-to-edge layout with safe area support.
* **Reading Progress Bar**: Subtle header progress indicator with exact percentage calculated in real time.
* **Position Persistence**: Automatically remembers your last read book, chapter, and scroll position via `localStorage`.

### 4. In-Chapter Full-Text Search
* Press `/` or click the search icon to search any term or Pali phrase across the active chapter.
* Instant highlighting with `<mark>` and clickable results that smoothly scroll to the exact match.

### 5. Keyboard Navigation
* `←` / `PageUp`: Previous Chapter
* `→` / `PageDown`: Next Chapter
* `j` / `k`: Smooth scroll down / up
* `/`: Search in chapter
* `t`: Cycle color theme
* `a` or `s`: Open appearance & settings modal
* `Esc`: Close open drawers or modals
