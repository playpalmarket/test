/**
 * @file script.js
 * @description Main script for the PlayPal.ID single-page application.
 * @version 2.1.0 (Patched data logic)
 */

(function () {
  'use strict';

  /**
   * Main configuration for the application.
   * @const {object}
   */
  const config = {
    sheetId: '1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw',
    sheets: {
      katalog: { name: 'Sheet3' },
      preorder: { name1: 'Sheet1', name2: 'Sheet2' },
      accounts: { name: 'Sheet5' },
    },
    waNumber: '6285877001999',
    waGreeting: '*Detail pesanan:*',
    paymentOptions: [
      { id: 'seabank', name: 'Seabank', feeType: 'fixed', value: 0 },
      { id: 'gopay', name: 'Gopay', feeType: 'fixed', value: 0 },
      { id: 'dana', name: 'Dana', feeType: 'fixed', value: 125 },
      { id: 'bank_to_dana', name: 'Bank ke Dana', feeType: 'fixed', value: 500 },
      { id: 'qris', name: 'Qris', feeType: 'percentage', value: 0.01 },
    ],
  };

  /**
   * Application's reactive state management.
   * @type {object}
   */
  const state = {
    currentSelectedItem: null,
    home: { searchQuery: '' },
    layanan: { activeCategory: '', searchQuery: '' },
    preorder: {
      initialized: false,
      allData: [],
      currentPage: 1,
      perPage: 15,
      displayMode: 'detailed',
    },
    accounts: {
      initialized: false,
      data: [],
      currentIndex: 0,
      currentAccount: null,
    },
  };

  /**
   * Cache of DOM elements for performance.
   * @const {object}
   */
  const elements = {
    sidebar: {
      nav: document.getElementById('sidebarNav'),
      overlay: document.getElementById('sidebarOverlay'),
      burger: document.getElementById('burgerBtn'),
      links: document.querySelectorAll('.sidebar-nav .nav-item'),
    },
    themeToggle: document.getElementById('themeToggleBtn'),
    views: {
      home: document.getElementById('viewHome'),
      layanan: document.getElementById('viewLayanan'),
      preorder: document.getElementById('viewPreorder'),
      accounts: document.getElementById('viewAccounts'),
      perpustakaan: document.getElementById('viewPerpustakaan'),
      film: document.getElementById('viewFilm'),
    },
    home: {
      listContainer: document.getElementById('homeListContainer'),
      searchInput: document.getElementById('homeSearchInput'),
      countInfo: document.getElementById('homeCountInfo'),
      errorContainer: document.getElementById('homeErrorContainer'),
    },
    layanan: {
      listContainer: document.getElementById('layananListContainer'),
      searchInput: document.getElementById('layananSearchInput'),
      countInfo: document.getElementById('layananCountInfo'),
      errorContainer: document.getElementById('layananErrorContainer'),
      customSelect: {
        wrapper: document.getElementById('layananCustomSelectWrapper'),
        btn: document.getElementById('layananCustomSelectBtn'),
        value: document.getElementById('layananCustomSelectValue'),
        options: document.getElementById('layananCustomSelectOptions'),
      },
    },
    preorder: {
      searchInput: document.getElementById('preorderSearchInput'),
      statusSelect: document.getElementById('preorderStatusSelect'),
      listContainer: document.getElementById('preorderListContainer'),
      prevBtn: document.getElementById('preorderPrevBtn'),
      nextBtn: document.getElementById('preorderNextBtn'),
      pageInfo: document.getElementById('preorderPageInfo'),
      total: document.getElementById('preorderTotal'),
      customSelect: {
        wrapper: document.getElementById('preorderCustomSelectWrapper'),
        btn: document.getElementById('preorderCustomSelectBtn'),
        value: document.getElementById('preorderCustomSelectValue'),
        options: document.getElementById('preorderCustomSelectOptions'),
      },
    },
    accounts: {
      display: document.getElementById('accountDisplay'),
      empty: document.getElementById('accountEmpty'),
      error: document.getElementById('accountError'),
      carousel: {
        track: document.getElementById('carouselTrack'),
        prevBtn: document.getElementById('carouselPrevBtn'),
        nextBtn: document.getElementById('carouselNextBtn'),
        indicators: document.getElementById('carouselIndicators'),
      },
      price: document.getElementById('accountPrice'),
      status: document.getElementById('accountStatus'),
      description: document.getElementById('accountDescription'),
      buyBtn: document.getElementById('buyAccountBtn'),
      offerBtn: document.getElementById('offerAccountBtn'),
      customSelect: {
        wrapper: document.getElementById('accountCustomSelectWrapper'),
        btn: document.getElementById('accountCustomSelectBtn'),
        value: document.getElementById('accountCustomSelectValue'),
        options: document.getElementById('accountCustomSelectOptions'),
      },
    },
    paymentModal: {
      modal: document.getElementById('paymentModal'),
      closeBtn: document.getElementById('closeModalBtn'),
      itemName: document.getElementById('modalItemName'),
      itemPrice: document.getElementById('modalItemPrice'),
      optionsContainer: document.getElementById('paymentOptionsContainer'),
      fee: document.getElementById('modalFee'),
      total: document.getElementById('modalTotal'),
      waBtn: document.getElementById('continueToWaBtn'),
    },
    templates: {
      item: document.getElementById('itemTemplate'),
      skeletonItem: document.getElementById('skeletonItemTemplate'),
      skeletonCard: document.getElementById('skeletonCardTemplate'),
    }
  };


  // =================================================================
  // UTILITY FUNCTIONS
  // =================================================================

  /**
   * Formats a number into Indonesian Rupiah currency format.
   * @param {number} value - The number to format.
   * @returns {string} The formatted currency string (e.g., "Rp 50.000").
   */
  function formatToIdr(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  /**
   * Generates a Google Sheets Gviz URL.
   * @param {string} sheetName - The name of the sheet.
   * @param {('json'|'csv')} format - The desired output format.
   * @returns {string} The complete Gviz URL.
   */
  function getSheetUrl(sheetName, format = 'json') {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${config.sheetId}/gviz/tq`;
    const encodedSheetName = encodeURIComponent(sheetName);
    return format === 'csv'
      ? `${baseUrl}?tqx=out:csv&sheet=${encodedSheetName}`
      : `${baseUrl}?sheet=${encodedSheetName}&tqx=out:json`;
  }

  // ... (Other utility functions like normalizeStatus remain unchanged)

  // =================================================================
  // DATA PARSING FUNCTIONS
  // =================================================================

  /**
   * Parses the JSON response from a Google Sheets Gviz URL (tqx=out:json).
   * @param {string} jsonText - The raw text response from the fetch call.
   * @returns {Array<object>} An array of structured item objects.
   */
  function parseGvizPairs(jsonText) {
    const match = jsonText.match(/\{.*\}/s);
    if (!match) throw new Error('Invalid GViz response format.');

    const obj = JSON.parse(match[0]);
    if (!obj.table || !obj.table.cols || !obj.table.rows) return [];
    
    const { rows, cols } = obj.table;
    const pairs = cols
      .map((col, i) => ({ index: i, label: col.label }))
      .filter(col => col.label && col.index % 2 === 0)
      .map(col => ({
        iTitle: col.index,
        iPrice: col.index + 1,
        label: col.label,
      }));

    const out = [];
    for (const r of rows) {
      if (!r.c) continue;
      const c = r.c;
      for (const p of pairs) {
        const title = c[p.iTitle]?.v?.toString().trim();
        const priceRaw = c[p.iPrice]?.v;
        const price = (priceRaw !== null && priceRaw !== '') ? Number(priceRaw) : NaN;
        if (title && !isNaN(price)) {
          out.push({
            catKey: p.label,
            catLabel: p.label.trim().replace(/\s+/g, ' '),
            title,
            price,
          });
        }
      }
    }
    return out;
  }

  // ... (Other parsing functions like robustCsvParser remain unchanged)

  // =================================================================
  // UI RENDERING & MANIPULATION FUNCTIONS
  // =================================================================
  
  // ... (Functions like showSkeleton, renderList, toggleTheme, setMode, etc. remain unchanged)

  // =================================================================
  // FEATURE-SPECIFIC FUNCTIONS (Katalog, Preorder, Accounts)
  // =================================================================

  /**
   * Fetches and processes catalog data from Google Sheets.
   */
  async function loadCatalog() {
    try {
      [elements.home.errorContainer, elements.layanan.errorContainer].forEach(el => el.style.display = 'none');
      showSkeleton(elements.home.listContainer, elements.templates.skeletonItem, 6);
      showSkeleton(elements.layanan.listContainer, elements.templates.skeletonItem, 6);
      
      const res = await fetch(getSheetUrl(config.sheets.katalog.name));
      if (!res.ok) throw new Error(`Network error: ${res.statusText}`);

      const text = await res.text();
      const allCatalogData = parseGvizPairs(text);
      if (allCatalogData.length === 0) throw new Error('Data is empty or format is incorrect.');
      
      const allCategories = [...new Map(allCatalogData.map(item => [item.catKey, item])).values()];
      const homeCatKey = allCategories.length > 0 ? allCategories[0].catKey : null;

      const homeData = homeCatKey ? allCatalogData.filter(item => item.catKey === homeCatKey) : [];
      
      // ==================================================
      // === PERBAIKAN LOGIKA ADA DI BARIS DI BAWAH INI ===
      // ==================================================
      const layananData = allCatalogData; // Layanan SELALU berisi SEMUA data.
      
      // Update data sources for rendering
      Object.assign(elements.home.listContainer, { dataSource: homeData });
      Object.assign(elements.layanan.listContainer, { dataSource: layananData });
      
      buildLayananCategorySelect(layananData);
      renderHomeList();
      renderLayananList();

    } catch (err) {
      console.error('Failed to load catalog:', err);
      [elements.home, elements.layanan].forEach(view => {
        view.listContainer.innerHTML = '';
        view.errorContainer.style.display = 'block';
        view.errorContainer.textContent = 'Oops, terjadi kesalahan. Silakan coba lagi nanti.';
      });
    }
  }

  /**
   * Renders the filtered list for the Home page.
   */
  function renderHomeList() {
    const data = elements.home.listContainer.dataSource || [];
    const query = state.home.searchQuery.toLowerCase();
    const items = data.filter(x => query === '' || x.title.toLowerCase().includes(query) || String(x.price).includes(query));
    renderList(elements.home.listContainer, elements.home.countInfo, items, 'Tidak ada promo ditemukan.');
  }

  /**
   * Renders the filtered list for the Layanan page.
   */
  function renderLayananList() {
    const data = elements.layanan.listContainer.dataSource || [];
    const { activeCategory, searchQuery } = state.layanan;
    const query = searchQuery.toLowerCase();
    const items = data.filter(x => x.catKey === activeCategory && (query === '' || x.title.toLowerCase().includes(query) || String(x.price).includes(query)));
    renderList(elements.layanan.listContainer, elements.layanan.countInfo, items, 'Tidak ada item di kategori ini.');
  }

  /**
   * Builds the category selection dropdown for the Layanan page.
   * @param {Array<object>} layananData - The data for Layanan items.
   */
  function buildLayananCategorySelect(layananData) {
    const { options, value } = elements.layanan.customSelect;
    const categoryMap = new Map();
    layananData.forEach(item => {
      if (!categoryMap.has(item.catKey)) {
        categoryMap.set(item.catKey, item.catLabel);
      }
    });

    const layananCategories = [...categoryMap].map(([key, label]) => ({ key, label }));
    options.innerHTML = '';

    layananCategories.forEach((cat, index) => {
      const el = document.createElement('div');
      el.className = 'custom-select-option';
      el.textContent = cat.label;
      el.dataset.value = cat.key;
      el.setAttribute('role', 'option');
      if (index === 0) el.classList.add('selected');

      el.addEventListener('click', () => {
        state.layanan.activeCategory = cat.key;
        value.textContent = cat.label;
        options.querySelector('.custom-select-option.selected')?.classList.remove('selected');
        el.classList.add('selected');
        toggleCustomSelect(elements.layanan.customSelect.wrapper, false);
        renderLayananList();
      });
      options.appendChild(el);
    });

    if (layananCategories.length > 0) {
      state.layanan.activeCategory = layananCategories[0].key;
      value.textContent = layananCategories[0].label;
    } else {
      value.textContent = 'Data tidak tersedia';
    }
  }

  // ... (All other functions for preorder, accounts, etc. remain unchanged)

  // =================================================================
  // INITIALIZATION FUNCTIONS
  // =================================================================

  /**
   * Main application entry point. Sets up global event listeners and loads initial data.
   */
  function initializeApp() {
    // --- Safe browsing event prevention ---
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('copy', e => e.preventDefault());
    
    // --- UI Interaction Listeners ---
    elements.themeToggle?.addEventListener('click', toggleTheme);
    elements.sidebar.burger?.addEventListener('click', () => toggleSidebar());
    elements.sidebar.overlay?.addEventListener('click', () => toggleSidebar(false));
    
    elements.sidebar.links.forEach(link => {
      if (link.dataset.mode) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          setMode(link.dataset.mode);
        });
      }
    });

    // --- Search Input Debouncing ---
    let homeDebounce, layananDebounce;
    elements.home.searchInput.addEventListener('input', (e) => {
      clearTimeout(homeDebounce);
      homeDebounce = setTimeout(() => {
        state.home.searchQuery = e.target.value.trim();
        renderHomeList();
      }, 250);
    });
    elements.layanan.searchInput.addEventListener('input', (e) => {
      clearTimeout(layananDebounce);
      layananDebounce = setTimeout(() => {
        state.layanan.searchQuery = e.target.value.trim();
        renderLayananList();
      }, 250);
    });

    // --- Modal Listeners ---
    elements.paymentModal.closeBtn.addEventListener('click', closePaymentModal);
    elements.paymentModal.modal.addEventListener('click', (e) => {
      if (e.target === elements.paymentModal.modal) closePaymentModal();
    });

    // --- Global Click Listener for closing dropdowns ---
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!elements.layanan.customSelect.wrapper.contains(target)) toggleCustomSelect(elements.layanan.customSelect.wrapper, false);
        if (elements.preorder.customSelect.wrapper && !elements.preorder.customSelect.wrapper.contains(target)) toggleCustomSelect(elements.preorder.customSelect.wrapper, false);
        if (elements.accounts.customSelect.wrapper && !elements.accounts.customSelect.wrapper.contains(target)) toggleCustomSelect(elements.accounts.customSelect.wrapper, false);
    });
    
    // --- Initial Load ---
    initializeTheme(); // This is a placeholder; full function code needed
    loadCatalog();
  }

  // --- All other functions like initializeTheme, initializePreorder, etc. should be here ---
  // For brevity, I am omitting the unchanged functions, but they should be in your final file.
  // The crucial change is ONLY in the loadCatalog() function.

  // Start the application once the DOM is fully loaded.
  document.addEventListener('DOMContentLoaded', initializeApp);

})();
