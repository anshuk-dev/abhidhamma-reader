/**
 * Abhidhamma Reader - Core Application Logic
 * Minimalist, high-performance reader for ancient Pali canonical texts & Dhamma literature
 * Featuring structured manuscript sheets, authentic PTS PDF viewer, and dual split-view
 */

(function () {
  'use strict';

  // --- Initialize PDF.js Worker ---
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  }

  // --- Application State ---
  const STATE = {
    library: null,
    activeBookId: 'dhammasangani',
    activeManifest: null,
    activeChapterId: null,
    chapterCache: new Map(),
    viewMode: 'html', // 'html' | 'pdf' | 'split'
    currentPageNumber: 1,
    settings: {
      theme: 'paper',
      fontFamily: 'serif',
      fontSize: 19,
      lineHeight: 1.8,
      width: '760px',
      align: 'left',
      showMarkers: true,
      viewMode: 'html'
    },
    pdf: {
      doc: null,
      bookId: null,
      page: 1,
      scale: 1.15,
      scaleMode: 'fit-width', // 'fit-width' | 'fit-page' | 'manual'
      isRendering: false,
      pendingPage: null,
      renderTask: null,
      totalPages: 1
    }
  };

  const STORAGE_KEY_SETTINGS = 'abhidhamma_reader_settings';
  const STORAGE_KEY_POSITION = 'abhidhamma_reader_last_pos';

  // --- Cached DOM Elements ---
  const el = {
    html: document.documentElement,
    body: document.body,
    appMain: document.getElementById('app-main'),
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

    // View Mode Switcher
    viewModeToggle: document.getElementById('view-mode-toggle'),
    btnModeHtml: document.getElementById('btn-mode-html'),
    btnModePdf: document.getElementById('btn-mode-pdf'),
    btnModeSplit: document.getElementById('btn-mode-split'),
    btnQuickPdfToggle: document.getElementById('btn-quick-pdf-toggle'),
    mobilePdfToggleLabel: document.getElementById('mobile-pdf-toggle-label'),

    // PDF Viewer Section
    pdfViewerSection: document.getElementById('pdf-viewer-section'),
    pdfToolbar: document.getElementById('pdf-toolbar'),
    btnPdfZoomOut: document.getElementById('btn-pdf-zoom-out'),
    btnPdfZoomIn: document.getElementById('btn-pdf-zoom-in'),
    pdfZoomLevelText: document.getElementById('pdf-zoom-level-text'),
    btnPdfFitWidth: document.getElementById('btn-pdf-fit-width'),
    btnPdfFitPage: document.getElementById('btn-pdf-fit-page'),
    btnPdfPrevPage: document.getElementById('btn-pdf-prev-page'),
    btnPdfNextPage: document.getElementById('btn-pdf-next-page'),
    pdfInputPage: document.getElementById('pdf-input-page'),
    pdfTotalPages: document.getElementById('pdf-total-pages'),
    btnPdfDownload: document.getElementById('btn-pdf-download'),
    btnPdfClose: document.getElementById('btn-pdf-close'),
    pdfCanvasContainer: document.getElementById('pdf-canvas-container'),
    pdfLoadingOverlay: document.getElementById('pdf-loading-overlay'),
    pdfLoadingText: document.getElementById('pdf-loading-text'),
    pdfPageWrapper: document.getElementById('pdf-page-wrapper'),
    pdfMainCanvas: document.getElementById('pdf-main-canvas'),

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

  // --- Application Bootstrapping ---
  async function init() {
    loadSettings();
    applySettings();
    setupEventListeners();
    await loadLibraryIndex();
    
    // Restore last read book & chapter if available
    const lastPos = loadLastPosition();
    const initialBook = (lastPos && lastPos.bookId) ? lastPos.bookId : 'dhammasangani';
    const initialChapter = (lastPos && lastPos.chapterId) ? lastPos.chapterId : null;
    const initialPage = (lastPos && lastPos.page) ? parseInt(lastPos.page, 10) : 1;
    STATE.currentPageNumber = initialPage;
    
    await selectBook(initialBook, initialChapter, lastPos ? lastPos.scrollY : 0);

    // Restore reading mode (default: html)
    const savedMode = (STATE.settings && STATE.settings.viewMode) ? STATE.settings.viewMode : 'html';
    setReadingMode(savedMode);
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
        page: STATE.currentPageNumber,
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

  // --- Reading Mode Management (Text, PDF, Dual Split) ---
  async function setReadingMode(mode) {
    if (mode !== 'html' && mode !== 'pdf' && mode !== 'split') {
      mode = 'html';
    }
    
    // On small screens, split mode gracefully degrades to full PDF mode
    if (mode === 'split' && window.innerWidth < 860) {
      mode = 'pdf';
    }

    STATE.viewMode = mode;
    STATE.settings.viewMode = mode;
    saveSettings();

    // Update container classes
    if (el.appMain) {
      el.appMain.classList.remove('mode-html', 'mode-pdf', 'mode-split');
      el.appMain.classList.add(`mode-${mode}`);
    }

    // Update header toggle buttons
    if (el.btnModeHtml) el.btnModeHtml.classList.toggle('active', mode === 'html');
    if (el.btnModePdf) el.btnModePdf.classList.toggle('active', mode === 'pdf');
    if (el.btnModeSplit) el.btnModeSplit.classList.toggle('active', mode === 'split');

    // Update mobile bottom bar button
    if (el.btnQuickPdfToggle) {
      el.btnQuickPdfToggle.classList.toggle('active', mode !== 'html');
      if (el.mobilePdfToggleLabel) {
        el.mobilePdfToggleLabel.textContent = (mode === 'html') ? 'PDF' : 'Text';
      }
    }

    if (mode === 'pdf' || mode === 'split') {
      const targetPage = STATE.currentPageNumber || 1;
      await loadPdfForBook(STATE.activeBookId);
      await renderPdfPage(targetPage);
    } else {
      // Switched back to HTML: ensure current page is in view
      if (STATE.pdf.page) {
        jumpToPage(STATE.pdf.page);
      }
    }
  }

  function togglePdfModeMobile() {
    if (STATE.viewMode === 'html') {
      setReadingMode('pdf');
    } else {
      setReadingMode('html');
    }
  }

  // --- High-Performance Embedded PDF Engine ---
  async function loadPdfForBook(bookId) {
    if (STATE.pdf.bookId === bookId && STATE.pdf.doc) {
      return STATE.pdf.doc;
    }

    showPdfLoading('Opening authentic PDF document...');
    try {
      const pdfUrl = `pdfs/${bookId}.pdf`;
      
      // Update download link
      if (el.btnPdfDownload) {
        el.btnPdfDownload.href = pdfUrl;
        el.btnPdfDownload.download = `${bookId}.pdf`;
      }

      if (!window.pdfjsLib) {
        throw new Error('PDF.js library is not loaded');
      }

      const loadingTask = window.pdfjsLib.getDocument({
        url: pdfUrl,
        cMapPacked: true
      });

      const doc = await loadingTask.promise;
      STATE.pdf.doc = doc;
      STATE.pdf.bookId = bookId;
      STATE.pdf.totalPages = doc.numPages;

      if (el.pdfTotalPages) el.pdfTotalPages.textContent = String(doc.numPages);
      if (el.pdfInputPage) el.pdfInputPage.max = String(doc.numPages);

      hidePdfLoading();
      return doc;
    } catch (err) {
      console.error('Failed to load PDF for book:', bookId, err);
      showPdfLoading(`PDF loading error: ${err.message || 'file not found'}`);
      return null;
    }
  }

  async function renderPdfPage(pageNum) {
    pageNum = parseInt(pageNum, 10);
    if (!STATE.pdf.doc || isNaN(pageNum)) return;

    pageNum = Math.max(1, Math.min(pageNum, STATE.pdf.totalPages));

    if (STATE.pdf.isRendering) {
      STATE.pdf.pendingPage = pageNum;
      return;
    }

    STATE.pdf.isRendering = true;
    STATE.pdf.page = pageNum;
    STATE.currentPageNumber = pageNum;

    // Sync controls
    if (el.pdfInputPage) el.pdfInputPage.value = pageNum;
    if (el.currentPageDisplay) el.currentPageDisplay.textContent = pageNum;
    if (el.pageSliderRange && document.activeElement !== el.pageSliderRange) {
      el.pageSliderRange.value = pageNum;
    }
    if (el.btnPdfPrevPage) el.btnPdfPrevPage.disabled = (pageNum <= 1);
    if (el.btnPdfNextPage) el.btnPdfNextPage.disabled = (pageNum >= STATE.pdf.totalPages);

    // Update progress bar
    const pct = Math.round((pageNum / STATE.pdf.totalPages) * 100);
    if (el.progressBar) el.progressBar.style.width = `${pct}%`;
    if (el.progressPill) el.progressPill.textContent = `${pct}%`;

    showPdfLoading('Rendering folio...');

    try {
      const page = await STATE.pdf.doc.getPage(pageNum);
      const container = el.pdfCanvasContainer;
      const canvas = el.pdfMainCanvas;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d', { alpha: false });

      // Calculate dynamic scale
      const baseViewport = page.getViewport({ scale: 1.0 });
      let scale = STATE.pdf.scale;

      if (STATE.pdf.scaleMode === 'fit-width') {
        const containerW = container.clientWidth - (window.innerWidth < 640 ? 16 : 48);
        scale = Math.max(0.4, Math.min(containerW / baseViewport.width, 3.2));
        STATE.pdf.scale = scale;
      } else if (STATE.pdf.scaleMode === 'fit-page') {
        const containerH = container.clientHeight - 48;
        scale = Math.max(0.4, Math.min(containerH / baseViewport.height, 3.2));
        STATE.pdf.scale = scale;
      }

      if (el.pdfZoomLevelText) {
        el.pdfZoomLevelText.textContent = `${Math.round(scale * 100)}%`;
      }

      // High DPI Retina Support (Sharpened scanned text & diacritics)
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const viewport = page.getViewport({ scale: scale });

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (STATE.pdf.renderTask) {
        try {
          STATE.pdf.renderTask.cancel();
        } catch (e) {}
      }

      STATE.pdf.renderTask = page.render({
        canvasContext: ctx,
        viewport: viewport
      });

      await STATE.pdf.renderTask.promise;
      STATE.pdf.renderTask = null;
      hidePdfLoading();
      saveLastPosition();

    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('PDF rendering error:', err);
      }
    } finally {
      STATE.pdf.isRendering = false;
      if (STATE.pdf.pendingPage !== null) {
        const next = STATE.pdf.pendingPage;
        STATE.pdf.pendingPage = null;
        renderPdfPage(next);
      }
    }
  }

  function showPdfLoading(msg) {
    if (el.pdfLoadingOverlay) {
      el.pdfLoadingOverlay.classList.add('active');
      if (el.pdfLoadingText && msg) el.pdfLoadingText.textContent = msg;
    }
  }

  function hidePdfLoading() {
    if (el.pdfLoadingOverlay) {
      el.pdfLoadingOverlay.classList.remove('active');
    }
  }

  function zoomPdf(factor) {
    STATE.pdf.scaleMode = 'manual';
    STATE.pdf.scale = Math.max(0.45, Math.min(STATE.pdf.scale * factor, 3.5));
    renderPdfPage(STATE.pdf.page);
  }

  function fitPdfWidth() {
    STATE.pdf.scaleMode = 'fit-width';
    renderPdfPage(STATE.pdf.page);
  }

  function fitPdfPage() {
    STATE.pdf.scaleMode = 'fit-page';
    renderPdfPage(STATE.pdf.page);
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
      
      // If currently in PDF or Split mode, load PDF
      if (STATE.viewMode === 'pdf' || STATE.viewMode === 'split') {
        await loadPdfForBook(bookId);
        await renderPdfPage(STATE.currentPageNumber || 1);
      }

      // Select chapter for HTML reader
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
    if (STATE.viewMode === 'pdf') {
      const pct = Math.round((STATE.pdf.page / STATE.pdf.totalPages) * 100);
      el.progressBar.style.width = `${pct}%`;
      el.progressPill.textContent = `${pct}%`;
      return;
    }

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
    const sheets = el.contentArea.querySelectorAll('.book-page-sheet, .book-page');
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
        const pageNum = parseInt(visiblePage, 10);
        STATE.currentPageNumber = pageNum;
        if (el.currentPageDisplay) el.currentPageDisplay.textContent = visiblePage;
        if (el.pageSliderRange && document.activeElement !== el.pageSliderRange) {
          el.pageSliderRange.value = visiblePage;
        }
        // In split dual mode, sync PDF with HTML reading
        if (STATE.viewMode === 'split' && STATE.pdf.doc && !STATE.pdf.isRendering && STATE.pdf.page !== pageNum) {
          renderPdfPage(pageNum);
        }
      }
    }
  }

  // --- Unified Page Navigation & Scrubber ---
  async function jumpToPage(targetPage) {
    if (!STATE.activeManifest) return;
    targetPage = parseInt(targetPage, 10);
    if (isNaN(targetPage) || targetPage < 1 || targetPage > STATE.activeManifest.total_pages) {
      return;
    }
    
    STATE.currentPageNumber = targetPage;
    if (el.currentPageDisplay) el.currentPageDisplay.textContent = targetPage;
    if (el.pageSliderRange) el.pageSliderRange.value = targetPage;
    if (el.inputJumpPage) el.inputJumpPage.value = targetPage;

    // In PDF or Split mode, render PDF page immediately
    if (STATE.viewMode === 'pdf' || STATE.viewMode === 'split') {
      await renderPdfPage(targetPage);
      if (STATE.viewMode === 'pdf') {
        return;
      }
    }
    
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
      { key: 'abhidhamma_pitaka', title: 'Canonical Abhidhamma Piṭaka', badge: 'Canonical' },
      { key: 'sutta_pitaka', title: 'Sutta Piṭaka', badge: 'Canonical' },
      { key: 'commentaries', title: 'Commentaries & Manuals', badge: 'Exegesis' },
      { key: 'dhamma_books', title: 'Dhamma & Abhidhamma Studies', badge: 'Study' },
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
        const isActive = (item.id === STATE.activeBookId);
        card.className = `library-item-card ${isActive ? 'active' : ''}`;
        card.dataset.bookId = item.id;
        
        const authorDesc = item.author ? `<div class="library-item-desc author">${escapeHtml(item.author)}</div>` : (item.translator ? `<div class="library-item-desc author">${escapeHtml(item.translator)}</div>` : '');
        const pageMeta = item.total_pages ? `${item.total_pages} pages` : (item.pages ? `${item.pages} pages` : 'Complete');

        card.innerHTML = `
          <div class="library-card-header">
            <div class="library-item-title">${escapeHtml(item.title)}</div>
            <span class="library-item-badge">${sec.badge}</span>
          </div>
          ${item.subtitle ? `<div class="library-item-desc">${escapeHtml(item.subtitle)}</div>` : ''}
          ${authorDesc}
          <div class="library-item-meta">${pageMeta}</div>
          <div class="library-card-actions">
            <button class="lib-action-btn read-html-btn" data-book-id="${item.id}" title="Read HTML Text">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              <span>Read Text</span>
            </button>
            <button class="lib-action-btn open-pdf-btn" data-book-id="${item.id}" title="Open Original PDF Facsimile">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span>Open PDF</span>
            </button>
          </div>
        `;
        
        card.querySelector('.read-html-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          selectBook(item.id);
          setReadingMode('html');
          switchDrawerTab('tab-active-toc');
          closeDrawer();
        });

        card.querySelector('.open-pdf-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          selectBook(item.id);
          setReadingMode('pdf');
          closeDrawer();
        });

        card.addEventListener('click', () => {
          selectBook(item.id);
          switchDrawerTab('tab-active-toc');
          closeDrawer();
        });

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
    
    const pages = el.contentArea.querySelectorAll('.book-page-sheet, .book-page');
    const matches = [];
    
    pages.forEach(pageEl => {
      const pageNum = pageEl.dataset.page || '—';
      const paras = pageEl.querySelectorAll('.reader-para, .reader-heading, .toc-row-title, .data-pair-key');
      
      paras.forEach(p => {
        const text = p.textContent;
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        
        let matchIndex = lowerText.indexOf(lowerQuery);
        if (matchIndex !== -1) {
          const start = Math.max(0, matchIndex - 60);
          const end = Math.min(text.length, matchIndex + query.length + 80);
          let snippet = (start > 0 ? '… ' : '') + text.substring(start, end) + (end < text.length ? ' …' : '');
          
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
    // Mode Switcher Buttons
    if (el.btnModeHtml) el.btnModeHtml.addEventListener('click', () => setReadingMode('html'));
    if (el.btnModePdf) el.btnModePdf.addEventListener('click', () => setReadingMode('pdf'));
    if (el.btnModeSplit) el.btnModeSplit.addEventListener('click', () => setReadingMode('split'));
    if (el.btnQuickPdfToggle) el.btnQuickPdfToggle.addEventListener('click', togglePdfModeMobile);
    if (el.btnPdfClose) el.btnPdfClose.addEventListener('click', () => setReadingMode('html'));

    // PDF Toolbar Controls
    if (el.btnPdfZoomIn) el.btnPdfZoomIn.addEventListener('click', () => zoomPdf(1.2));
    if (el.btnPdfZoomOut) el.btnPdfZoomOut.addEventListener('click', () => zoomPdf(0.83));
    if (el.btnPdfFitWidth) el.btnPdfFitWidth.addEventListener('click', fitPdfWidth);
    if (el.btnPdfFitPage) el.btnPdfFitPage.addEventListener('click', fitPdfPage);
    if (el.btnPdfPrevPage) el.btnPdfPrevPage.addEventListener('click', () => renderPdfPage(STATE.pdf.page - 1));
    if (el.btnPdfNextPage) el.btnPdfNextPage.addEventListener('click', () => renderPdfPage(STATE.pdf.page + 1));
    
    if (el.pdfInputPage) {
      el.pdfInputPage.addEventListener('change', (e) => {
        renderPdfPage(e.target.value);
      });
      el.pdfInputPage.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') renderPdfPage(e.target.value);
      });
    }

    // Touch Pinch & Zoom Handlers for PDF Viewport
    let touchStartDistance = null;
    let touchStartScale = null;

    if (el.pdfCanvasContainer) {
      el.pdfCanvasContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          touchStartDistance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
          );
          touchStartScale = STATE.pdf.scale;
        }
      }, { passive: true });

      el.pdfCanvasContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && touchStartDistance && el.pdfPageWrapper) {
          const curDist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
          );
          const ratio = curDist / touchStartDistance;
          el.pdfPageWrapper.style.transform = `scale(${ratio})`;
        }
      }, { passive: true });

      el.pdfCanvasContainer.addEventListener('touchend', (e) => {
        if (touchStartDistance && touchStartScale && el.pdfPageWrapper) {
          const transform = el.pdfPageWrapper.style.transform;
          const match = transform.match(/scale\(([^)]+)\)/);
          if (match) {
            const ratio = parseFloat(match[1]);
            if (!isNaN(ratio) && ratio !== 1.0) {
              STATE.pdf.scaleMode = 'manual';
              STATE.pdf.scale = Math.max(0.45, Math.min(touchStartScale * ratio, 3.5));
              renderPdfPage(STATE.pdf.page);
            }
          }
          el.pdfPageWrapper.style.transform = '';
          touchStartDistance = null;
          touchStartScale = null;
        }
      }, { passive: true });

      // Ctrl / Cmd + Mouse Wheel Zoom
      el.pdfCanvasContainer.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const factor = (e.deltaY < 0) ? 1.15 : 0.87;
          zoomPdf(factor);
        }
      }, { passive: false });
    }

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

    // Window Resize Handling for PDF auto-fit
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if ((STATE.viewMode === 'pdf' || STATE.viewMode === 'split') && STATE.pdf.scaleMode !== 'manual') {
          renderPdfPage(STATE.pdf.page);
        }
      }, 200);
    });

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
      if (document.activeElement === el.searchQueryInput || document.activeElement === el.pdfInputPage || document.activeElement === el.inputJumpPage) {
        if (e.key === 'Escape') {
          closeSearch();
          closeSettings();
        }
        return;
      }
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          if (STATE.viewMode === 'pdf') {
            renderPdfPage(STATE.pdf.page - 1);
          } else {
            navigateChapter(-1);
          }
          break;
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          if (STATE.viewMode === 'pdf') {
            renderPdfPage(STATE.pdf.page + 1);
          } else {
            navigateChapter(1);
          }
          break;
        case '+':
        case '=':
          if (STATE.viewMode === 'pdf' || STATE.viewMode === 'split') {
            zoomPdf(1.2);
          }
          break;
        case '-':
        case '_':
          if (STATE.viewMode === 'pdf' || STATE.viewMode === 'split') {
            zoomPdf(0.83);
          }
          break;
        case 'j':
          if (STATE.viewMode === 'pdf') {
            el.pdfCanvasContainer.scrollBy({ top: 120, behavior: 'smooth' });
          } else {
            window.scrollBy({ top: 120, behavior: 'smooth' });
          }
          break;
        case 'k':
          if (STATE.viewMode === 'pdf') {
            el.pdfCanvasContainer.scrollBy({ top: -120, behavior: 'smooth' });
          } else {
            window.scrollBy({ top: -120, behavior: 'smooth' });
          }
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
        case 'p':
          // Quick shortcut to toggle PDF mode
          togglePdfModeMobile();
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
