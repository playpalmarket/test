// script.js (versi rapih tanpa duplikasi menu)
(function () {
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
    ]
  };

  let catalogData = [];
  let catalogCategories = [];
  let activeCategory = '';
  let searchQuery = '';
  let currentSelectedItem = null;

  const state = {
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

  function getElement(id) {
    return document.getElementById(id);
  }

  const elements = {
    viewCatalog: getElement('viewCatalog'),
    viewPreorder: getElement('viewPreorder'),
    viewAccounts: getElement('viewAccounts'),
    listContainer: getElement('listContainer'),
    searchInput: getElement('searchInput'),
    countInfo: getElement('countInfo'),
    errorContainer: getElement('errorContainer'),
    itemTemplate: getElement('itemTemplate'),
    skeletonItemTemplate: getElement('skeletonItemTemplate'),
    skeletonCardTemplate: getElement('skeletonCardTemplate'),
    customSelect: {
      wrapper: getElement('customSelectWrapper'),
      btn: getElement('customSelectBtn'),
      value: getElement('customSelectValue'),
      options: getElement('customSelectOptions'),
    },
    burgers: {
      cat: getElement('burgerCat'),
      po: getElement('burgerPo'),
      acc: getElement('burgerAcc'),
    },
    menus: {
      cat: getElement('menuCat'),
      po: getElement('menuPo'),
      acc: getElement('menuAcc'),
    },
    themeToggles: {
      cat: getElement('themeToggleBtn'),
      po: getElement('themeToggleBtnPo'),
      acc: getElement('themeToggleBtnAcc'),
    },
    paymentModal: {
      modal: getElement('paymentModal'),
      closeBtn: getElement('closeModalBtn'),
      itemName: getElement('modalItemName'),
      itemPrice: getElement('modalItemPrice'),
      optionsContainer: getElement('paymentOptionsContainer'),
      fee: getElement('modalFee'),
      total: getElement('modalTotal'),
      waBtn: getElement('continueToWaBtn'),
    },
    preorder: {
      searchInput: getElement('preorderSearchInput'),
      statusSelect: getElement('preorderStatusSelect'),
      sheetSelect: getElement('preorderSheetSelect'),
      listContainer: getElement('preorderListContainer'),
      prevBtn: getElement('preorderPrevBtn'),
      nextBtn: getElement('preorderNextBtn'),
      total: getElement('preorderTotal'),
    },
    accounts: {
      select: getElement('accountSelect'),
      display: getElement('accountDisplay'),
      empty: getElement('accountEmpty'),
      error: getElement('accountError'),
      carousel: {
        track: getElement('carouselTrack'),
        prevBtn: getElement('carouselPrevBtn'),
        nextBtn: getElement('carouselNextBtn'),
      },
      price: getElement('accountPrice'),
      status: getElement('accountStatus'),
      description: getElement('accountDescription'),
      buyBtn: getElement('buyAccountBtn'),
      offerBtn: getElement('offerAccountBtn'),
    },
  };

  // util
  function formatToIdr(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  function getSheetUrl(sheetName, format = 'json') {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${config.sheetId}/gviz/tq`;
    const encodedSheetName = encodeURIComponent(sheetName);
    return format === 'csv'
      ? `${baseUrl}?tqx=out:csv&sheet=${encodedSheetName}`
      : `${baseUrl}?sheet=${encodedSheetName}&tqx=out:json`;
  }

  function showSkeleton(container, template, count = 6) {
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      fragment.appendChild(template.content.cloneNode(true));
    }
    container.appendChild(fragment);
  }

  function initScrollAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
    document.querySelectorAll('header.reveal-on-scroll').forEach((el) => observer.observe(el));
  }

  function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(currentTheme);
  }

  function toggleTheme() {
    const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }

  // ---- Menu handled by menu.js (MenuModule) ----
  window.setMode = function (nextMode) {
    const currentActive = document.querySelector('.view-section.active');
    const viewMap = {
      katalog: elements.viewCatalog,
      preorder: elements.viewPreorder,
      accounts: elements.viewAccounts,
    };
    const nextView = viewMap[nextMode];

    if (!nextView || currentActive === nextView) return;

    currentActive?.classList.remove('active');
    nextView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (nextMode === 'preorder' && !state.preorder.initialized) {
      initializePreorder();
    }
    if (nextMode === 'accounts' && !state.accounts.initialized) {
      initializeAccounts();
    }
  };

  // Catalog
  function parseGvizPairs(jsonText) {
    const match = jsonText.match(/\{.*\}/s);
    if (!match) throw new Error('Invalid GViz response.');
    const obj = JSON.parse(match[0]);
    const table = obj.table || {};
    const rows = table.rows || [];
    const cols = table.cols || [];
    const pairs = Array.from({ length: Math.floor(cols.length / 2) }, (_, i) => ({
      iTitle: i * 2,
      iPrice: i * 2 + 1,
      label: cols[i * 2]?.label || '',
    })).filter((p) => p.label && cols[p.iPrice]);
    const out = [];
    for (const r of rows) {
      const c = r.c || [];
      for (const p of pairs) {
        const title = String(c[p.iTitle]?.v || '').trim();
        const priceRaw = c[p.iPrice]?.v;
        const price = priceRaw != null && priceRaw !== '' ? Number(priceRaw) : NaN;
        if (title && !isNaN(price)) {
          out.push({
            catKey: p.label,
            catLabel: String(p.label || '').trim().replace(/\s+/g, ' '),
            title,
            price,
          });
        }
      }
    }
    return out;
  }

  function toggleCustomSelect(forceOpen) {
    const { wrapper, btn } = elements.customSelect;
    const isOpen = typeof forceOpen === 'boolean' ? forceOpen : !wrapper.classList.contains('open');
    wrapper.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', isOpen);
  }

  function buildCategorySelect() {
    const { options, value } = elements.customSelect;
    const categoryMap = new Map();
    catalogData.forEach((item) => {
      if (!categoryMap.has(item.catKey)) {
        categoryMap.set(item.catKey, item.catLabel);
      }
    });
    catalogCategories = [...categoryMap].map(([key, label]) => ({ key, label }));
    options.innerHTML = '';
    catalogCategories.forEach((cat, index) => {
      const el = document.createElement('div');
      el.className = 'custom-select-option';
      el.textContent = cat.label;
      el.dataset.value = cat.key;
      el.setAttribute('role', 'option');
      if (index === 0) el.classList.add('selected');
      el.addEventListener('click', () => {
        activeCategory = cat.key;
        value.textContent = cat.label;
        document.querySelector('.custom-select-option.selected')?.classList.remove('selected');
        el.classList.add('selected');
        toggleCustomSelect(false);
        renderCatalogList();
      });
      options.appendChild(el);
    });
    if (catalogCategories.length > 0) {
      activeCategory = catalogCategories[0].key;
      value.textContent = catalogCategories[0].label;
    } else {
      value.textContent = 'Data tidak tersedia';
    }
  }

  function renderCatalogList() {
    const items = catalogData.filter(
      (x) =>
        x.catKey === activeCategory &&
        (searchQuery === '' ||
          x.title.toLowerCase().includes(searchQuery) ||
          String(x.price).includes(searchQuery))
    );
    elements.listContainer.innerHTML = '';
    if (items.length === 0) {
      elements.listContainer.innerHTML = `<div class="empty">Tidak ada hasil ditemukan.</div>`;
      elements.countInfo.textContent = '';
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const clone = elements.itemTemplate.content.cloneNode(true);
      const buttonEl = clone.querySelector('.list-item');
      buttonEl.querySelector('.title').textContent = item.title;
      buttonEl.querySelector('.price').textContent = formatToIdr(item.price);
      buttonEl.addEventListener('click', () => openPaymentModal(item));
      fragment.appendChild(buttonEl);
    }
    elements.listContainer.appendChild(fragment);
    elements.countInfo.textContent = `${items.length} item ditemukan`;
  }

  async function loadCatalog() {
    try {
      elements.errorContainer.style.display = 'none';
      showSkeleton(elements.listContainer, elements.skeletonItemTemplate, 9);
      const res = await fetch(getSheetUrl(config.sheets.katalog.name), { cache: 'no-store' });
      if (!res.ok) throw new Error(`Network error: ${res.statusText}`);
      const text = await res.text();
      catalogData = parseGvizPairs(text);
      if (catalogData.length === 0) throw new Error('Data is empty or format is incorrect.');
      buildCategorySelect();
      renderCatalogList();
    } catch (err) {
      console.error('Failed to load catalog:', err);
      elements.listContainer.innerHTML = '';
      elements.errorContainer.style.display = 'block';
      elements.errorContainer.textContent = 'Oops, terjadi kesalahan. Silakan coba lagi nanti.';
    }
  }

  // (… bagian Preorder, Payment Modal, Accounts dsb. sama seperti sebelumnya …)
  // demi ringkas tidak aku ulang semua di sini, tapi intinya tidak ada lagi logika menu ganda

  // ---- init ----
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initScrollAnimations();
    elements.themeToggles.cat?.addEventListener('click', toggleTheme);
    elements.themeToggles.po?.addEventListener('click', toggleTheme);
    elements.themeToggles.acc?.addEventListener('click', toggleTheme);
    loadCatalog();
  });
})();
