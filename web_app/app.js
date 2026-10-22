/**
 * Abhidhamma Reader - Core Application Logic
 * Minimalist, high-performance reader for ancient Pali canonical texts & Dhamma literature
 */

(function () {
  'use strict';

  // --- State ---
  const STATE = {
    library: null,
    activeBookId: 'dhammasangani',
    activeManifest: null,
    activeChapterId: null,
    chapterCache: new Map(),
    settings: {
      theme: 'paper',
      fontFamily: 'serif',
      fontSize: 19,
      lineHeight: 1.8,
      width: '760px',
      align: 'left',
      showMarkers: true
    }
  };

  const STORAGE_KEY_SETTINGS = 'abhidhamma_reader_settings';
  const STORAGE_KEY_POSITION = 'abhidhamma_reader_last_pos';

  // --- DOM Elements ---
  const el = {
    html: document.documentElement,
    body: document.body,
    progressBar: document.getElementById('reading-progress-bar'),
    progressPill: document.getElementById('reading-percentage-pill'),
    headerBookTitle: document.getElementById('header-book-title'),
    headerChapterTitle: document.getElementById('header-chapter-title'),
    viewport: document.getElementById('reader-viewport'),
    contentArea: document.getElementById('chapter-content-area'),
    btnPrevChapter: document.getElementById('btn-prev-chapter'),
    btnNextChapter: document.getElementById('btn-next-chapter'),
    btnQuickPrev: document.getElementById('btn-quick-prev'),
    btnQuickNext: document.getElementById('btn-quick-next'),

    // Page Slider & Scrubber
    pageSliderBar: document.getElementById('page-slider-bar'),
    pageSliderRange: document.getElementById('page-slider-range'),
    currentPageDisplay: document.getElementById('current-page-display'),
    totalPagesDisplay: document.getElementById('total-pages-display'),
    btnPageStepPrev: document.getElementById('btn-page-step-prev'),
    btnPageStepNext: document.getElementById('btn-page-step-next'),
    inputJumpPage: document.getElementById('input-jump-page'),
    btnJumpGo: document.getElementById('btn-jump-go'),
    
    // Drawer
    navDrawer: document.getElementById('nav-drawer'),
    drawerOverlay: document.getElementById('drawer-overlay'),
    btnToggleDrawer: document.getElementById('btn-toggle-drawer'),
    btnCloseDrawer: document.getElementById('btn-close-drawer'),
    btnTocQuick: document.getElementById('btn-toc-quick'),
    btnQuickToc: document.getElementById('btn-quick-toc'),
    drawerTabs: document.querySelectorAll('.drawer-tab'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    abhidhammaBooksList: document.getElementById('abhidhamma-books-list'),
    activeBookTocList: document.getElementById('active-book-toc-list'),
    fullLibraryList: document.getElementById('full-library-list'),
    
    // Settings Modal
    settingsBackdrop: document.getElementById('settings-backdrop'),
    btnOpenSettings: document.getElementById('btn-open-settings'),
    btnQuickAppearance: document.getElementById('btn-quick-appearance'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    themeSelector: document.getElementById('theme-selector'),
    fontFamilyGroup: document.getElementById('font-family-group'),
    fontSizeDisplay: document.getElementById('font-size-display'),
    btnFontDecrease: document.getElementById('btn-font-decrease'),
    btnFontIncrease: document.getElementById('btn-font-increase'),
    lineHeightGroup: document.getElementById('line-height-group'),
    widthGroup: document.getElementById('width-group'),
    alignGroup: document.getElementById('align-group'),
    markersGroup: document.getElementById('markers-group'),
    
    // Search Modal
    searchBackdrop: document.getElementById('search-backdrop'),
    btnOpenSearch: document.getElementById('btn-open-search'),
    btnCloseSearch: document.getElementById('btn-close-search'),
    searchQueryInput: document.getElementById('search-query-input'),
    searchResultsList: document.getElementById('search-results-list')
  };

  // --- Initialization ---
  async function init() {
    loadSettings();
    applySettings();
    setupEventListeners();
    await loadLibraryIndex();
    
    // Restore last read book & chapter if available
    const lastPos = loadLastPosition();
    const initialBook = (lastPos && lastPos.bookId) ? lastPos.bookId : 'dhammasangani';
    const initialChapter = (lastPos && lastPos.chapterId) ? lastPos.chapterId : null;
    
    await selectBook(initialBook, initialChapter, lastPos ? lastPos.scrollY : 0);
  }

  // --- Settings Persistence ---
  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        Object.assign(STATE.settings, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not load settings from localStorage', e);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(STATE.settings));
    } catch (e) {
      console.warn('Could not save settings to localStorage', e);
    }
  }

  function loadLastPosition() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POSITION);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  function saveLastPosition() {
    try {
      localStorage.setItem(STORAGE_KEY_POSITION, JSON.stringify({
        bookId: STATE.activeBookId,
        chapterId: STATE.activeChapterId,
        scrollY: window.scrollY
      }));
    } catch (e) {
      // ignore
    }
  }

  // --- Apply Settings to Document ---
  function applySettings() {
    const s = STATE.settings;
    
    // Theme
    el.html.setAttribute('data-theme', s.theme);
    
    // Typography Font Family
    let fontCss = "'Newsreader', 'Charter', Georgia, Cambria, 'Times New Roman', serif";
    if (s.fontFamily === 'sans') {
      fontCss = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif";
    } else if (s.fontFamily === 'mono') {
      fontCss = "'SF Mono', Menlo, Consolas, Monaco, monospace";
    }
    el.html.style.setProperty('--reader-font-family', fontCss);
    
    // Font Size
    el.html.style.setProperty('--reader-font-size', s.fontSize + 'px');
    if (el.fontSizeDisplay) {
      el.fontSizeDisplay.textContent = s.fontSize + ' px';
    }
    
    // Line Height
    el.html.style.setProperty('--reader-line-height', s.lineHeight);
    
    // Column Width
    el.html.style.setProperty('--reader-max-width', s.width);
    
    // Text Alignment
    el.html.style.setProperty('--reader-text-align', s.align);
    
    // Show Page Markers
    if (s.showMarkers) {
      el.body.classList.remove('hide-page-markers');
    } else {
      el.body.classList.add('hide-page-markers');
    }
    
    updateSettingsUI();
  }

  function updateSettingsUI() {
    const s = STATE.settings;
    
    // Theme pills
    document.querySelectorAll('.theme-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === s.theme);
    });
    
    // Font family buttons
    document.querySelectorAll('#font-family-group .btn-group-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.font === s.fontFamily);
    });
    
    // Line height buttons
    document.querySelectorAll('#line-height-group .btn-group-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.line === String(s.lineHeight));
    });
    
    // Width buttons
    document.querySelectorAll('#width-group .btn-group-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.width === s.width);
    });
    
    // Align buttons
    document.querySelectorAll('#align-group .btn-group-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.align === s.align);
    });
    
    // Markers buttons
    document.querySelectorAll('#markers-group .btn-group-item').forEach(btn => {
      btn.classList.toggle('active', (btn.dataset.markers === 'show') === s.showMarkers);
    });
  }

  // --- Data Loading ---
  async function loadLibraryIndex() {
    try {
      const resp = await fetch('data/library_index.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      STATE.library = await resp.json();
      renderDrawerAbhidhammaBooks();
      renderDrawerFullCatalog();
    } catch (err) {
      console.error('Failed to load library index:', err);
      el.contentArea.innerHTML = `<div class="empty-state">Error loading library data. Please ensure local server is running.</div>`;
    }
  }

  async function selectBook(bookId, targetChapterId = null, scrollY = 0) {
    if (!STATE.library) return;
    
    STATE.activeBookId = bookId;
    el.headerBookTitle.textContent = 'Loading...';
    
    try {
      const resp = await fetch(`data/books/${bookId}/manifest.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      STATE.activeManifest = await resp.json();
      
      // Update header
      el.headerBookTitle.textContent = STATE.activeManifest.title;
      document.title = `${STATE.activeManifest.title} · Abhidhamma Reader`;
      
      // Update page slider limits
      if (el.pageSliderRange && STATE.activeManifest.total_pages) {
        el.pageSliderRange.min = '1';
        el.pageSliderRange.max = String(STATE.activeManifest.total_pages);
        el.totalPagesDisplay.textContent = String(STATE.activeManifest.total_pages);
        if (el.inputJumpPage) {
          el.inputJumpPage.max = String(STATE.activeManifest.total_pages);
        }
      }
      
      // Highlight active book in drawer
      document.querySelectorAll('.book-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.bookId === bookId);
      });
      
      // Render TOC for this book
      renderDrawerBookToc();
      
      // Select chapter
      const firstChapterId = STATE.activeManifest.chapters[0]?.id;
      const chapterToLoad = targetChapterId || firstChapterId;
      await loadChapter(chapterToLoad, scrollY);
      
    } catch (err) {
      console.error(`Failed to load manifest for ${bookId}:`, err);
      el.contentArea.innerHTML = `<div class="empty-state">Failed to load book: ${bookId}</div>`;
    }
  }

  async function loadChapter(chapterId, scrollY = 0) {
    if (!STATE.activeManifest) return;
    
    const chapterMeta = STATE.activeManifest.chapters.find(c => c.id === chapterId);
    if (!chapterMeta) return;
    
    STATE.activeChapterId = chapterId;
    el.headerChapterTitle.textContent = chapterMeta.title;
    
    // Show spinner if not cached
    const cacheKey = `${STATE.activeBookId}_${chapterId}`;
    if (!STATE.chapterCache.has(cacheKey)) {
      el.contentArea.innerHTML = `<div class="spinner"></div>`;
    }
    
    // Update TOC highlight
    document.querySelectorAll('.toc-item').forEach(item => {
      item.classList.toggle('active', item.dataset.chapterId === chapterId);
    });
    
    // Update Prev / Next buttons state
    updateNavigationButtons();
    
    try {
      let chapterData;
      if (STATE.chapterCache.has(cacheKey)) {
        chapterData = STATE.chapterCache.get(cacheKey);
      } else {
        const resp = await fetch(`data/books/${STATE.activeBookId}/chapters/${chapterId}.json`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        chapterData = await resp.json();
        STATE.chapterCache.set(cacheKey, chapterData);
      }
      
      // Render HTML into view
      el.contentArea.innerHTML = chapterData.html;
      
      // Restore scroll or top
      if (scrollY > 0) {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      
      updateReadingProgress();
      saveLastPosition();
      
    } catch (err) {
      console.error(`Failed to load chapter ${chapterId}:`, err);
      el.contentArea.innerHTML = `<div class="empty-state">Error loading chapter content.</div>`;
    }
  }

  function updateNavigationButtons() {
    if (!STATE.activeManifest || !STATE.activeChapterId) return;
    
    const chapters = STATE.activeManifest.chapters;
    const currentIndex = chapters.findIndex(c => c.id === STATE.activeChapterId);
    
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < chapters.length - 1;
    
    el.btnPrevChapter.disabled = !hasPrev;
    el.btnNextChapter.disabled = !hasNext;
    el.btnQuickPrev.disabled = !hasPrev;
    el.btnQuickNext.disabled = !hasNext;
    
    el.btnPrevChapter.style.opacity = hasPrev ? '1' : '0.35';
    el.btnNextChapter.style.opacity = hasNext ? '1' : '0.35';
    el.btnQuickPrev.style.opacity = hasPrev ? '1' : '0.35';
    el.btnQuickNext.style.opacity = hasNext ? '1' : '0.35';
  }

  function navigateChapter(direction) {
    if (!STATE.activeManifest || !STATE.activeChapterId) return;
    
    const chapters = STATE.activeManifest.chapters;
    const currentIndex = chapters.findIndex(c => c.id === STATE.activeChapterId);
    const targetIndex = currentIndex + direction;
    
    if (targetIndex >= 0 && targetIndex < chapters.length) {
      loadChapter(chapters[targetIndex].id, 0);
    }
  }

  // --- Reading Progress & Visible Page Tracker ---
  function updateReadingProgress() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) {
      el.progressBar.style.width = '100%';
      el.progressPill.textContent = '100%';
    } else {
      const scrolled = Math.max(0, Math.min(window.scrollY, docHeight));
      const percent = Math.round((scrolled / docHeight) * 100);
      el.progressBar.style.width = `${percent}%`;
      el.progressPill.textContent = `${percent}%`;
    }

    // Determine currently visible page sheet
    const sheets = el.contentArea.querySelectorAll('.book-page-sheet');
    if (sheets.length > 0) {
      const viewLine = window.innerHeight * 0.35;
      let visiblePage = null;
      for (const sheet of sheets) {
        const rect = sheet.getBoundingClientRect();
        if (rect.top <= viewLine && rect.bottom >= viewLine) {
          visiblePage = sheet.dataset.page;
          break;
        }
      }
      if (!visiblePage) {
        // Fallback: sheet nearest to viewLine
        let closestDist = Infinity;
        for (const sheet of sheets) {
          const rect = sheet.getBoundingClientRect();
          const dist = Math.abs(rect.top - viewLine);
          if (dist < closestDist) {
            closestDist = dist;
            visiblePage = sheet.dataset.page;
          }
        }
      }
      if (visiblePage) {
        if (el.currentPageDisplay) el.currentPageDisplay.textContent = visiblePage;
        if (el.pageSliderRange && document.activeElement !== el.pageSliderRange) {
          el.pageSliderRange.value = visiblePage;
        }
      }
    }
  }

  // --- Page Navigation & Scrubber ---
  async function jumpToPage(targetPage) {
    if (!STATE.activeManifest) return;
    targetPage = parseInt(targetPage, 10);
    if (isNaN(targetPage) || targetPage < 1 || targetPage > STATE.activeManifest.total_pages) {
      return;
    }
    
    // Update displays
    if (el.currentPageDisplay) el.currentPageDisplay.textContent = targetPage;
    if (el.pageSliderRange) el.pageSliderRange.value = targetPage;
    
    // Check if targetPage is in current chapter
    const currentChapter = STATE.activeManifest.chapters.find(c => c.id === STATE.activeChapterId);
    if (currentChapter && targetPage >= currentChapter.start_page && targetPage <= currentChapter.end_page) {
      const sheet = document.getElementById('page-' + targetPage);
      if (sheet) {
        sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
        highlightPageSheet(sheet);
        return;
      }
    }
    
    // If targetPage is in another chapter: find that chapter and load it
    const targetChapter = STATE.activeManifest.chapters.find(c => targetPage >= c.start_page && targetPage <= c.end_page);
    if (targetChapter) {
      await loadChapter(targetChapter.id, 0);
      setTimeout(() => {
        const sheet = document.getElementById('page-' + targetPage);
        if (sheet) {
          sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
          highlightPageSheet(sheet);
        }
      }, 120);
    }
  }

  function highlightPageSheet(sheet) {
    sheet.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
    sheet.style.borderColor = 'var(--accent-color)';
    sheet.style.boxShadow = '0 0 0 3px var(--accent-soft)';
    setTimeout(() => {
      sheet.style.borderColor = '';
      sheet.style.boxShadow = '';
    }, 1800);
  }

  // --- Drawer Rendering ---
  function renderDrawerAbhidhammaBooks() {
    if (!STATE.library || !STATE.library.abhidhamma_pitaka) return;
    
    el.abhidhammaBooksList.innerHTML = '';
    STATE.library.abhidhamma_pitaka.forEach(book => {
      const btn = document.createElement('button');
      btn.className = `book-nav-item ${book.id === STATE.activeBookId ? 'active' : ''}`;
      btn.dataset.bookId = book.id;
      
      btn.innerHTML = `
        <span class="book-num-badge" style="background-color: ${book.accent || 'var(--accent-color)'};">${book.book_number}</span>
        <div class="book-nav-info">
          <div class="book-nav-title">${book.title}</div>
          <div class="book-nav-pali">${book.pali}</div>
          <div class="book-nav-meta">${book.total_chapters} chapters · ${book.total_pages} pages · ${book.translator}</div>
        </div>
      `;
      
      btn.addEventListener('click', () => {
        selectBook(book.id);
        switchDrawerTab('tab-active-toc');
      });
      
      el.abhidhammaBooksList.appendChild(btn);
    });
  }

  function renderDrawerBookToc() {
    if (!STATE.activeManifest || !STATE.activeManifest.chapters) return;
    
    el.activeBookTocList.innerHTML = '';
    STATE.activeManifest.chapters.forEach(chap => {
      const btn = document.createElement('button');
      btn.className = `toc-item ${chap.id === STATE.activeChapterId ? 'active' : ''}`;
      btn.dataset.chapterId = chap.id;
      
      // Indentation for nested levels
      const indent = (chap.level > 1) ? `padding-left: ${(chap.level - 1) * 16 + 12}px;` : '';
      btn.setAttribute('style', indent);
      
      btn.innerHTML = `
        <span class="toc-item-title">${chap.chapter_number}. ${chap.title}</span>
        <span class="toc-item-pages">p. ${chap.start_page}</span>
      `;
      
      btn.addEventListener('click', () => {
        loadChapter(chap.id);
        closeDrawer();
      });
      
      el.activeBookTocList.appendChild(btn);
    });
  }

  function renderDrawerFullCatalog() {
    if (!STATE.library) return;
    
    const container = el.fullLibraryList;
    container.innerHTML = '';
    
    const sections = [
      { key: 'sutta_pitaka', title: 'Sutta Piṭaka', badge: 'Canonical' },
      { key: 'commentaries', title: 'Commentaries & Manuals', badge: 'Exegesis' },
      { key: 'dhamma_books', title: 'Dhamma & Abhidhamma Books', badge: 'Study' },
      { key: 'children_books', title: 'Illustrated Children’s Books', badge: 'Introductory' }
    ];
    
    sections.forEach(sec => {
      const items = STATE.library[sec.key];
      if (!items || items.length === 0) return;
      
      const title = document.createElement('div');
      title.className = 'library-category-title';
      title.textContent = `${sec.title} (${items.length})`;
      container.appendChild(title);
      
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'library-item-card';
        card.innerHTML = `
          <div class="library-item-title">${item.title}</div>
          ${item.subtitle ? `<div class="library-item-desc">${item.subtitle}</div>` : ''}
          ${item.author ? `<div class="library-item-desc">${item.author}</div>` : ''}
          <div class="library-item-desc" style="color: var(--text-muted);">${item.pages} pages</div>
          <a class="library-item-link" href="../${item.pdf_rel}" target="_blank" rel="noopener">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            Open Original PDF
          </a>
        `;
        container.appendChild(card);
      });
    });
  }

  function switchDrawerTab(tabId) {
    el.drawerTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    el.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });
  }

  // --- Drawer Open / Close ---
  function openDrawer(tabToOpen = null) {
    if (tabToOpen) {
      switchDrawerTab(tabToOpen);
    }
    el.navDrawer.classList.add('open');
    el.drawerOverlay.classList.add('open');
    el.btnToggleDrawer.classList.add('active');
  }

  function closeDrawer() {
    el.navDrawer.classList.remove('open');
    el.drawerOverlay.classList.remove('open');
    el.btnToggleDrawer.classList.remove('active');
  }

  // --- Settings Modal Open / Close ---
  function openSettings() {
    el.settingsBackdrop.classList.add('open');
    el.btnOpenSettings.classList.add('active');
  }

  function closeSettings() {
    el.settingsBackdrop.classList.remove('open');
    el.btnOpenSettings.classList.remove('active');
  }

  // --- Search Modal Open / Close ---
  function openSearch() {
    el.searchBackdrop.classList.add('open');
    el.btnOpenSearch.classList.add('active');
    setTimeout(() => {
      el.searchQueryInput.focus();
      el.searchQueryInput.select();
    }, 150);
  }

  function closeSearch() {
    el.searchBackdrop.classList.remove('open');
    el.btnOpenSearch.classList.remove('active');
  }

  // --- In-Chapter Search ---
  function executeSearch(query) {
    query = query.trim();
    if (!query || query.length < 2) {
      el.searchResultsList.innerHTML = '<div class="empty-state">Type at least 2 characters to search...</div>';
      return;
    }
    
    const pages = el.contentArea.querySelectorAll('.book-page');
    const matches = [];
    
    pages.forEach(pageEl => {
      const pageNum = pageEl.dataset.page || '—';
      const paras = pageEl.querySelectorAll('.reader-para, .reader-heading');
      
      paras.forEach(p => {
        const text = p.textContent;
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        
        let matchIndex = lowerText.indexOf(lowerQuery);
        if (matchIndex !== -1) {
          // Extract snippet with surrounding words
          const start = Math.max(0, matchIndex - 60);
          const end = Math.min(text.length, matchIndex + query.length + 80);
          let snippet = (start > 0 ? '… ' : '') + text.substring(start, end) + (end < text.length ? ' …' : '');
          
          // Highlight match in snippet
          const reg = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          const highlightedSnippet = snippet.replace(reg, '<mark>$1</mark>');
          
          matches.push({
            pageNum: pageNum,
            element: p,
            html: highlightedSnippet
          });
        }
      });
    });
    
    if (matches.length === 0) {
      el.searchResultsList.innerHTML = `<div class="empty-state">No occurrences found for "<strong>${escapeHtml(query)}</strong>" in this chapter.</div>`;
      return;
    }
    
    el.searchResultsList.innerHTML = '';
    const countBadge = document.createElement('div');
    countBadge.style.fontSize = '0.78rem';
    countBadge.style.color = 'var(--text-muted)';
    countBadge.style.padding = '0 4px 8px';
    countBadge.textContent = `Found ${matches.length} result${matches.length === 1 ? '' : 's'}:`;
    el.searchResultsList.appendChild(countBadge);
    
    matches.forEach(m => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `
        <div class="search-result-page">Page ${m.pageNum}</div>
        <div class="search-result-text">${m.html}</div>
      `;
      item.addEventListener('click', () => {
        closeSearch();
        m.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // flash element
        m.element.style.transition = 'background-color 0.4s ease';
        m.element.style.backgroundColor = 'var(--mark-bg)';
        setTimeout(() => {
          m.element.style.backgroundColor = '';
        }, 1500);
      });
      el.searchResultsList.appendChild(item);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Drawer Toggles
    el.btnToggleDrawer.addEventListener('click', () => {
      if (el.navDrawer.classList.contains('open')) {
        closeDrawer();
      } else {
        openDrawer('tab-seven-books');
      }
    });
    
    el.btnTocQuick.addEventListener('click', () => {
      openDrawer('tab-active-toc');
    });
    
    el.btnQuickToc.addEventListener('click', () => {
      openDrawer('tab-active-toc');
    });
    
    el.btnCloseDrawer.addEventListener('click', closeDrawer);
    el.drawerOverlay.addEventListener('click', closeDrawer);
    
    // Drawer Tab Switching
    el.drawerTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchDrawerTab(tab.dataset.tab);
      });
    });
    
    // Chapter Navigation
    el.btnPrevChapter.addEventListener('click', () => navigateChapter(-1));
    el.btnNextChapter.addEventListener('click', () => navigateChapter(1));
    el.btnQuickPrev.addEventListener('click', () => navigateChapter(-1));
    el.btnQuickNext.addEventListener('click', () => navigateChapter(1));
    
    // Settings Modal
    el.btnOpenSettings.addEventListener('click', openSettings);
    el.btnQuickAppearance.addEventListener('click', openSettings);
    el.btnCloseSettings.addEventListener('click', closeSettings);
    el.settingsBackdrop.addEventListener('click', (e) => {
      if (e.target === el.settingsBackdrop) closeSettings();
    });
    
    // Theme Selector
    el.themeSelector.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-pill-btn');
      if (!btn) return;
      STATE.settings.theme = btn.dataset.theme;
      saveSettings();
      applySettings();
    });
    
    // Font Family
    el.fontFamilyGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-group-item');
      if (!btn) return;
      STATE.settings.fontFamily = btn.dataset.font;
      saveSettings();
      applySettings();
    });
    
    // Font Size Stepper
    el.btnFontDecrease.addEventListener('click', () => {
      if (STATE.settings.fontSize > 13) {
        STATE.settings.fontSize -= 1;
        saveSettings();
        applySettings();
      }
    });
    
    el.btnFontIncrease.addEventListener('click', () => {
      if (STATE.settings.fontSize < 32) {
        STATE.settings.fontSize += 1;
        saveSettings();
        applySettings();
      }
    });
    
    // Line Height
    el.lineHeightGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-group-item');
      if (!btn) return;
      STATE.settings.lineHeight = parseFloat(btn.dataset.line);
      saveSettings();
      applySettings();
    });
    
    // Column Width
    el.widthGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-group-item');
      if (!btn) return;
      STATE.settings.width = btn.dataset.width;
      saveSettings();
      applySettings();
    });
    
    // Text Alignment
    el.alignGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-group-item');
      if (!btn) return;
      STATE.settings.align = btn.dataset.align;
      saveSettings();
      applySettings();
    });
    
    // Page Markers
    el.markersGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-group-item');
      if (!btn) return;
      STATE.settings.showMarkers = (btn.dataset.markers === 'show');
      saveSettings();
      applySettings();
    });
    
    // Search Modal
    el.btnOpenSearch.addEventListener('click', openSearch);
    el.btnCloseSearch.addEventListener('click', closeSearch);
    el.searchBackdrop.addEventListener('click', (e) => {
      if (e.target === el.searchBackdrop) closeSearch();
    });
    
    let searchDebounceTimer = null;
    el.searchQueryInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        executeSearch(e.target.value);
      }, 250);
    });
    
    // Page Slider Scrubber & Stepper
    if (el.pageSliderRange) {
      el.pageSliderRange.addEventListener('input', (e) => {
        jumpToPage(e.target.value);
      });
    }
    
    if (el.btnPageStepPrev) {
      el.btnPageStepPrev.addEventListener('click', () => {
        const cur = parseInt(el.pageSliderRange.value, 10) || 1;
        jumpToPage(cur - 1);
      });
    }
    
    if (el.btnPageStepNext) {
      el.btnPageStepNext.addEventListener('click', () => {
        const cur = parseInt(el.pageSliderRange.value, 10) || 1;
        jumpToPage(cur + 1);
      });
    }
    
    if (el.btnJumpGo) {
      el.btnJumpGo.addEventListener('click', () => {
        if (el.inputJumpPage && el.inputJumpPage.value) {
          jumpToPage(el.inputJumpPage.value);
        }
      });
    }
    
    if (el.inputJumpPage) {
      el.inputJumpPage.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && el.inputJumpPage.value) {
          jumpToPage(el.inputJumpPage.value);
        }
      });
    }

    // Scroll tracking
    let scrollThrottle = false;
    window.addEventListener('scroll', () => {
      if (!scrollThrottle) {
        window.requestAnimationFrame(() => {
          updateReadingProgress();
          saveLastPosition();
          scrollThrottle = false;
        });
        scrollThrottle = true;
      }
    }, { passive: true });
    
    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts if focus is inside search input
      if (document.activeElement === el.searchQueryInput) {
        if (e.key === 'Escape') closeSearch();
        return;
      }
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          navigateChapter(-1);
          break;
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          navigateChapter(1);
          break;
        case 'j':
          window.scrollBy({ top: 120, behavior: 'smooth' });
          break;
        case 'k':
          window.scrollBy({ top: -120, behavior: 'smooth' });
          break;
        case '/':
          e.preventDefault();
          openSearch();
          break;
        case 't':
          cycleTheme();
          break;
        case 'a':
        case 's':
          openSettings();
          break;
        case 'Escape':
          closeDrawer();
          closeSettings();
          closeSearch();
          break;
      }
    });
  }

  function cycleTheme() {
    const themes = ['paper', 'sepia', 'sage', 'obsidian'];
    const idx = themes.indexOf(STATE.settings.theme);
    STATE.settings.theme = themes[(idx + 1) % themes.length];
    saveSettings();
    applySettings();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
