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
    ],
  };

  let allCatalogData = [];
  let homeData = [];
  let layananData = [];
  let layananCategories = [];
  
  let currentSelectedItem = null;

  const state = {
    layanan: {
      activeCategory: '',
      searchQuery: ''
    },
    home: {
      searchQuery: ''
    },
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
    sidebar: {
      nav: getElement('sidebarNav'),
      overlay: getElement('sidebarOverlay'),
      burger: getElement('burgerBtn'),
      links: document.querySelectorAll('.sidebar-nav .nav-item'),
    },
    themeToggle: getElement('themeToggleBtn'),
    
    viewHome: getElement('viewHome'),
    viewLayanan: getElement('viewLayanan'),
    viewPreorder: getElement('viewPreorder'),
    viewAccounts: getElement('viewAccounts'),
    viewPerpustakaan: getElement('viewPerpustakaan'),
    viewFilm: getElement('viewFilm'),
    
    home: {
      listContainer: getElement('homeListContainer'),
      searchInput: getElement('homeSearchInput'),
      countInfo: getElement('homeCountInfo'),
      errorContainer: getElement('homeErrorContainer'),
    },
    layanan: {
      listContainer: getElement('layananListContainer'),
      searchInput: getElement('layananSearchInput'),
      countInfo: getElement('layananCountInfo'),
      errorContainer: getElement('layananErrorContainer'),
      customSelect: {
        wrapper: getElement('layananCustomSelectWrapper'),
        btn: getElement('layananCustomSelectBtn'),
        value: getElement('layananCustomSelectValue'),
        options: getElement('layananCustomSelectOptions'),
      },
    },
    itemTemplate: getElement('itemTemplate'),
    skeletonItemTemplate: getElement('skeletonItemTemplate'),
    skeletonCardTemplate: getElement('skeletonCardTemplate'),
    
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
      listContainer: getElement('preorderListContainer'),
      prevBtn: getElement('preorderPrevBtn'),
      nextBtn: getElement('preorderNextBtn'),
      pageInfo: getElement('preorderPageInfo'),
      total: getElement('preorderTotal'),
      customSelect: {
        wrapper: getElement('preorderCustomSelectWrapper'),
        btn: getElement('preorderCustomSelectBtn'),
        value: getElement('preorderCustomSelectValue'),
        options: getElement('preorderCustomSelectOptions'),
      },
    },
    accounts: {
      display: getElement('accountDisplay'),
      empty: getElement('accountEmpty'),
      error: getElement('accountError'),
      carousel: {
        track: getElement('carouselTrack'),
        prevBtn: getElement('carouselPrevBtn'),
        nextBtn: getElement('carouselNextBtn'),
        indicators: getElement('carouselIndicators'),
      },
      price: getElement('accountPrice'),
      status: getElement('accountStatus'),
      description: getElement('accountDescription'),
      buyBtn: getElement('buyAccountBtn'),
      offerBtn: getElement('offerAccountBtn'),
      customSelect: {
        wrapper: getElement('accountCustomSelectWrapper'),
        btn: getElement('accountCustomSelectBtn'),
        value: getElement('accountCustomSelectValue'),
        options: getElement('accountCustomSelectOptions'),
      },
    },
  };

  function formatToIdr(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
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

  function applyTheme(theme) { document.body.classList.toggle('dark-mode', theme === 'dark'); }
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

  function toggleSidebar(forceOpen) {
    const isOpen = typeof forceOpen === 'boolean' ? forceOpen : !document.body.classList.contains('sidebar-open');
    document.body.classList.toggle('sidebar-open', isOpen);
    elements.sidebar.burger.classList.toggle('active', isOpen);
  }

  function setMode(nextMode) {
    if (nextMode === 'donasi') {
        window.open('https://saweria.co/playpal', '_blank', 'noopener');
        return;
    }

    const viewMap = {
      home: elements.viewHome,
      layanan: elements.viewLayanan,
      preorder: elements.viewPreorder,
      accounts: elements.viewAccounts,
      perpustakaan: elements.viewPerpustakaan,
      film: elements.viewFilm,
    };
    const nextView = viewMap[nextMode];
    if (!nextView) return;

    document.querySelector('.view-section.active')?.classList.remove('active');
    nextView.classList.add('active');
    
    elements.sidebar.links.forEach(link => {
        link.classList.toggle('active', link.dataset.mode === nextMode);
    });

    if (window.innerWidth < 769) {
      toggleSidebar(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (nextMode === 'preorder' && !state.preorder.initialized) initializePreorder();
    if (nextMode === 'accounts' && !state.accounts.initialized) initializeAccounts();
  }

  function parseGvizPairs(jsonText) {
    const match = jsonText.match(/\{.*\}/s);
    if (!match) throw new Error('Invalid GViz response.');

    const obj = JSON.parse(match[0]);
    const { rows = [], cols = [] } = obj.table || {};

    const pairs = Array.from({ length: Math.floor(cols.length / 2) }, (_, i) => ({
      iTitle: i * 2, iPrice: i * 2 + 1, label: cols[i * 2]?.label || '',
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
            title, price,
          });
        }
      }
    }
    return out;
  }

  function toggleCustomSelect(wrapper, forceOpen) {
    const btn = wrapper.querySelector('.custom-select-btn');
    const isOpen = typeof forceOpen === 'boolean' ? forceOpen : !wrapper.classList.contains('open');
    wrapper.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', isOpen);
  }

  function buildLayananCategorySelect() {
    const { options, value } = elements.layanan.customSelect;
    const categoryMap = new Map();
    layananData.forEach((item) => {
      if (!categoryMap.has(item.catKey)) {
        categoryMap.set(item.catKey, item.catLabel);
      }
    });

    layananCategories = [...categoryMap].map(([key, label]) => ({ key, label }));
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
        document.querySelector('#layananCustomSelectOptions .custom-select-option.selected')?.classList.remove('selected');
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

  function renderList(container, countInfoEl, items, emptyText) {
    container.innerHTML = '';
    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty">
          <div class="empty-content">
            <svg xmlns="http://www.w3.org/2000/svg" class="empty-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <p>${emptyText}</p>
          </div>
        </div>`;
      countInfoEl.textContent = '';
      return;
    }

    const fragment = document.createDocumentFragment();
    let animationDelay = 0;
    for (const item of items) {
      const clone = elements.itemTemplate.content.cloneNode(true);
      const buttonEl = clone.querySelector('.list-item');
      
      buttonEl.style.animationDelay = `${animationDelay}ms`;
      animationDelay += 50;

      buttonEl.querySelector('.title').textContent = item.title;
      buttonEl.querySelector('.price').textContent = formatToIdr(item.price);
      buttonEl.addEventListener('click', () => openPaymentModal(item));
      fragment.appendChild(buttonEl);
    }
    container.appendChild(fragment);
    countInfoEl.textContent = `${items.length} item ditemukan`;
  }

  function renderHomeList() {
    const query = state.home.searchQuery;
    const items = homeData.filter(
      (x) => query === '' || x.title.toLowerCase().includes(query) || String(x.price).includes(query)
    );
    renderList(elements.home.listContainer, elements.home.countInfo, items, 'Tidak ada hasil ditemukan.');
  }

  function renderLayananList() {
    const { activeCategory, searchQuery } = state.layanan;
    const items = layananData.filter(
      (x) =>
        x.catKey === activeCategory &&
        (searchQuery === '' || x.title.toLowerCase().includes(searchQuery) || String(x.price).includes(searchQuery))
    );
    renderList(elements.layanan.listContainer, elements.layanan.countInfo, items, 'Tidak ada hasil ditemukan.');
  }

  async function loadCatalog() {
    try {
      [elements.home.errorContainer, elements.layanan.errorContainer].forEach(el => el.style.display = 'none');
      showSkeleton(elements.home.listContainer, elements.skeletonItemTemplate, 6);
      showSkeleton(elements.layanan.listContainer, elements.skeletonItemTemplate, 6);
      
      const res = await fetch(getSheetUrl(config.sheets.katalog.name), { cache: 'no-store' });
      if (!res.ok) throw new Error(`Network error: ${res.statusText}`);

      const text = await res.text();
      allCatalogData = parseGvizPairs(text);
      if (allCatalogData.length === 0) throw new Error('Data is empty or format is incorrect.');

      const allCategories = [...new Map(allCatalogData.map(item => [item.catKey, item])).values()];
      const homeCatKey = allCategories.length > 0 ? allCategories[0].catKey : null;

      if (homeCatKey) {
          homeData = allCatalogData.filter(item => item.catKey === homeCatKey);
          layananData = allCatalogData.filter(item => item.catKey !== homeCatKey);
      } else {
          layananData = allCatalogData;
      }
      
      buildLayananCategorySelect();
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

  function calculateFee(price, option) {
    if (option.feeType === 'fixed') return option.value;
    if (option.feeType === 'percentage') return Math.ceil(price * option.value);
    return 0;
  }

  function updatePriceDetails() {
    const selectedOptionId = document.querySelector('input[name="payment"]:checked').value;
    const selectedOption = config.paymentOptions.find((opt) => opt.id === selectedOptionId);
    const price = currentSelectedItem.price;
    const fee = calculateFee(price, selectedOption);
    const total = price + fee;

    elements.paymentModal.fee.textContent = formatToIdr(fee);
    elements.paymentModal.total.textContent = formatToIdr(total);
    updateWaLink(selectedOption, fee, total);
  }

  function updateWaLink(option, fee, total) {
    const { catLabel, title, price } = currentSelectedItem;
    const text = [
      config.waGreeting, `› Tipe: ${catLabel}`, `› Item: ${title}`, `› Pembayaran: ${option.name}`,
      `› Harga: ${formatToIdr(price)}`, `› Fee: ${formatToIdr(fee)}`, `› Total: ${formatToIdr(total)}`,
    ].join('\n');
    elements.paymentModal.waBtn.href = `https://wa.me/${config.waNumber}?text=${encodeURIComponent(text)}`;
  }

  function openPaymentModal(item) {
    currentSelectedItem = item;
    const { modal, itemName, itemPrice, optionsContainer } = elements.paymentModal;
    itemName.textContent = item.title;
    itemPrice.textContent = formatToIdr(item.price);
    optionsContainer.innerHTML = '';

    config.paymentOptions.forEach((option, index) => {
      const fee = calculateFee(item.price, option);
      optionsContainer.insertAdjacentHTML('beforeend', `
        <div class="payment-option">
          <input type="radio" id="${option.id}" name="payment" value="${option.id}" ${index === 0 ? 'checked' : ''}>
          <label for="${option.id}">
            ${option.name} <span style="float: right;">+ ${formatToIdr(fee)}</span>
          </label>
        </div>`);
    });

    optionsContainer.querySelectorAll('input[name="payment"]').forEach((input) => input.addEventListener('change', updatePriceDetails));
    updatePriceDetails();
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
  }

  function closePaymentModal() {
    const { modal } = elements.paymentModal;
    modal.classList.remove('visible');
    setTimeout(() => { modal.style.display = 'none'; currentSelectedItem = null; }, 200);
  }

  function normalizeStatus(rawStatus) {
    const s = String(rawStatus || '').trim().toLowerCase();
    if (['success', 'selesai', 'berhasil', 'done'].includes(s)) return 'success';
    if (['progress', 'proses', 'diproses', 'processing'].includes(s)) return 'progress';
    if (['failed', 'gagal', 'dibatalkan', 'cancel', 'error'].includes(s)) return 'failed';
    return 'pending';
  }

  function filterPreorderData() {
    const { searchInput, statusSelect } = elements.preorder;
    const query = searchInput.value.trim().toLowerCase();
    const statusFilter = statusSelect.value;
    const currentMode = state.preorder.displayMode;

    return state.preorder.allData.filter((item) => {
      const status = normalizeStatus(item[currentMode === 'detailed' ? 6 : 2]);
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      if (currentMode === 'detailed') {
        const product = (item[3] || '').toLowerCase();
        const nickname = (item[5] || '').toLowerCase();
        const idGift = (item[7] || '').toLowerCase();
        return product.includes(query) || nickname.includes(query) || idGift.includes(query);
      } else {
        const orderNum = (item[0] || '').toLowerCase();
        const product = (item[1] || '').toLowerCase();
        return orderNum.includes(query) || product.includes(query);
      }
    });
  }

  function updatePreorderPagination(currentPage, totalPages) {
    elements.preorder.prevBtn.disabled = currentPage <= 1;
    elements.preorder.nextBtn.disabled = currentPage >= totalPages;
    if (totalPages > 0) {
        elements.preorder.pageInfo.textContent = `Hal ${currentPage} dari ${totalPages}`;
    } else {
        elements.preorder.pageInfo.textContent = '';
    }
  }

  function renderPreorderCards() {
    const filtered = filterPreorderData();
    const totalItems = state.preorder.allData.length;
    const { perPage } = state.preorder;
    const { listContainer, total } = elements.preorder;

    total.textContent = `${totalItems} total pesanan${filtered.length !== totalItems ? `, ${filtered.length} ditemukan` : ''}`;

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    state.preorder.currentPage = Math.min(Math.max(1, state.preorder.currentPage), totalPages);
    const start = (state.preorder.currentPage - 1) * perPage;
    const pageData = filtered.slice(start, start + perPage);
    listContainer.innerHTML = '';

    if (pageData.length === 0) {
      listContainer.innerHTML = `<div class="empty"><div class="empty-content"><svg xmlns="http://www.w3.org/2000/svg" class="empty-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg><p>Tidak Ada Hasil Ditemukan</p></div></div>`;
      updatePreorderPagination(0, 0);
      return;
    }

    const fragment = document.createDocumentFragment();
    pageData.forEach((item) => {
      const card = document.createElement('article');
      if (state.preorder.displayMode === 'detailed') {
        const [tglOrder, estPengiriman, , product, bulan, name, statusRaw] = item;
        const status = normalizeStatus(statusRaw);
        const estDeliveryText = estPengiriman ? `Estimasi Pengiriman: ${estPengiriman} 20:00 WIB` : '';
        const details = [{ label: 'TGL ORDER', value: tglOrder }, { label: 'BULAN', value: bulan }];
        const detailsHtml = details.filter((d) => d.value && String(d.value).trim() !== '').map(d => `<div class="detail-item"><div class="detail-label">${d.label}</div><div class="detail-value">${d.value}</div></div>`).join('');
        
        const expandIndicatorHtml = detailsHtml ? `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="expand-indicator">
          <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
        </svg>` : '';

        card.className = `card ${detailsHtml ? 'clickable' : ''}`;
        card.innerHTML = `
          <div class="card-header">
            <div>
              <div class="card-name">${name || 'Tanpa Nama'}</div>
              <div class="card-product">${product || 'N/A'}</div>
            </div>
            <div class="status-badge-wrapper">
                <div class="status-badge ${status}">${(statusRaw || 'Pending').toUpperCase()}</div>
                ${expandIndicatorHtml}
            </div>
          </div>
          ${estDeliveryText ? `<div class="card-date">${estDeliveryText}</div>` : ''}
          ${detailsHtml ? `<div class="card-details"><div class="details-grid">${detailsHtml}</div></div>` : ''}`;
        
        if (detailsHtml) card.addEventListener('click', () => card.classList.toggle('expanded'));
      } else {
        const [orderNum, product, statusRaw] = item;
        const status = normalizeStatus(statusRaw);
        card.className = 'card';
        card.innerHTML = `
          <div class="card-header">
            <div><div class="card-name">${orderNum || 'Tanpa Nomor'}</div><div class="card-product">${product || 'N/A'}</div></div>
            <div class="status-badge ${status}">${(statusRaw || 'Pending').toUpperCase()}</div>
          </div>`;
      }
      fragment.appendChild(card);
    });
    listContainer.appendChild(fragment);
    updatePreorderPagination(state.preorder.currentPage, totalPages);
  }

  function sortPreorderData(data, mode) {
    const statusOrder = { progress: 1, pending: 2, success: 3, failed: 4 };
    const statusIndex = mode === 'detailed' ? 6 : 2;
    return data.sort((a, b) => statusOrder[normalizeStatus(a[statusIndex])] - statusOrder[normalizeStatus(b[statusIndex])]);
  }

  async function fetchPreorderData(sheetName) {
    const { listContainer, total } = elements.preorder;
    total.textContent = 'Memuat data...';
    showSkeleton(listContainer, elements.skeletonCardTemplate, 5);
    state.preorder.displayMode = sheetName === config.sheets.preorder.name1 ? 'detailed' : 'simple';

    try {
      const res = await fetch(getSheetUrl(sheetName, 'csv'), { cache: 'no-store' });
      if (!res.ok) throw new Error(`Network error: ${res.statusText}`);

      const text = await res.text();
      let rows = text.trim().split('\n').map((r) => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.replace(/^"|"$/g, '').trim()));
      
      if (rows.length < 2) {
        state.preorder.allData = [];
      } else {
        rows.shift();
        const dataRows = rows.filter((row) => row && (row[0] || '').trim() !== '');
        state.preorder.allData = sortPreorderData(dataRows, state.preorder.displayMode);
      }
    } catch (e) {
      state.preorder.allData = [];
      total.textContent = 'Gagal memuat data.';
      console.error('Fetch Pre-Order failed:', e);
    } finally {
      state.preorder.currentPage = 1;
      renderPreorderCards();
    }
  }

  function initializePreorder() {
    if (state.preorder.initialized) return;
    const rebound = () => { state.preorder.currentPage = 1; renderPreorderCards(); };
    const { searchInput, statusSelect, customSelect, prevBtn, nextBtn } = elements.preorder;
    searchInput.addEventListener('input', rebound);
    statusSelect.addEventListener('change', rebound);
    
    customSelect.options.querySelectorAll('.custom-select-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const selectedValue = e.target.dataset.value;
            const selectedText = e.target.textContent;
            
            customSelect.value.textContent = selectedText;
            document.querySelector('#preorderCustomSelectOptions .custom-select-option.selected')?.classList.remove('selected');
            e.target.classList.add('selected');
            
            const sheet = selectedValue === '0' ? config.sheets.preorder.name1 : config.sheets.preorder.name2;
            fetchPreorderData(sheet);
            toggleCustomSelect(customSelect.wrapper, false);
        });
    });
    customSelect.btn.addEventListener('click', () => toggleCustomSelect(customSelect.wrapper));

    prevBtn.addEventListener('click', () => { if (state.preorder.currentPage > 1) { state.preorder.currentPage--; renderPreorderCards(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    nextBtn.addEventListener('click', () => { state.preorder.currentPage++; renderPreorderCards(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    const initialSheet = config.sheets.preorder.name1;
    fetchPreorderData(initialSheet);
    state.preorder.initialized = true;
  }
  
  function robustCsvParser(text) {
    const normalizedText = text.trim().replace(/\r\n/g, '\n');
    const rows = []; let currentRow = []; let currentField = ''; let inQuotedField = false;
    for (let i = 0; i < normalizedText.length; i++) {
      const char = normalizedText[i];
      if (inQuotedField) {
        if (char === '"') { if (i + 1 < normalizedText.length && normalizedText[i + 1] === '"') { currentField += '"'; i++; } else { inQuotedField = false; } } else { currentField += char; }
      } else {
        if (char === '"') { inQuotedField = true; } else if (char === ',') { currentRow.push(currentField); currentField = ''; } else if (char === '\n') { currentRow.push(currentField); rows.push(currentRow); currentRow = []; currentField = ''; } else { currentField += char; }
      }
    }
    currentRow.push(currentField); rows.push(currentRow);
    return rows;
  }

  async function parseAccountsSheet(text) {
    const rows = robustCsvParser(text); rows.shift();
    return rows.filter(row => row && row.length >= 5 && row[0]).map(row => ({
      title: row[0] || 'Tanpa Judul', price: Number(row[1]) || 0, status: row[2] || 'Tersedia',
      description: row[3] || 'Tidak ada deskripsi.', images: (row[4] || '').split(',').map((url) => url.trim()).filter(Boolean),
    }));
  }

  function populateAccountSelect() {
    const { customSelect, empty } = elements.accounts;
    const { options, value } = customSelect;
    options.innerHTML = '';
    
    if (state.accounts.data.length === 0) {
      value.textContent = 'Tidak ada akun';
      empty.style.display = 'block';
      return;
    }

    value.textContent = 'Pilih Akun';

    state.accounts.data.forEach((acc, index) => {
      const el = document.createElement('div');
      el.className = 'custom-select-option';
      el.textContent = acc.title;
      el.dataset.value = index;
      el.setAttribute('role', 'option');

      el.addEventListener('click', () => {
        value.textContent = acc.title;
        document.querySelector('#accountCustomSelectOptions .custom-select-option.selected')?.classList.remove('selected');
        el.classList.add('selected');
        toggleCustomSelect(customSelect.wrapper, false);
        renderAccount(index);
      });
      options.appendChild(el);
    });
  }

  function renderAccount(index) {
    const { display, empty, price, description, status: statusEl } = elements.accounts;
    const account = state.accounts.data[index];
    state.accounts.currentAccount = account;

    if (!account) { display.style.display = 'none'; empty.style.display = 'block'; return; }

    display.classList.remove('expanded');
    price.textContent = formatToIdr(account.price);
    description.textContent = account.description;
    statusEl.textContent = account.status;
    statusEl.className = 'account-status-badge';
    statusEl.classList.add(account.status.toLowerCase() === 'tersedia' ? 'available' : 'sold');

    const { track, indicators } = elements.accounts.carousel;
    track.innerHTML = '';
    indicators.innerHTML = '';

    if (account.images && account.images.length > 0) {
      account.images.forEach((src, i) => {
        track.insertAdjacentHTML('beforeend', `<div class="carousel-slide"><img src="${src}" alt="Gambar untuk ${account.title}" loading="lazy"></div>`);
        indicators.insertAdjacentHTML('beforeend', `<button class="indicator-dot" data-index="${i}"></button>`);
      });
    } else {
      track.insertAdjacentHTML('beforeend', `<div class="carousel-slide"><div style="display:flex;align-items:center;justify-content:center;height:100%;aspect-ratio:16/9;background-color:var(--surface-secondary);color:var(--text-tertiary);">Gambar tidak tersedia</div></div>`);
    }

    indicators.querySelectorAll('.indicator-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        state.accounts.currentIndex = parseInt(e.target.dataset.index);
        updateCarousel();
      });
    });

    state.accounts.currentIndex = 0;
    updateCarousel();
    empty.style.display = 'none'; display.style.display = 'block';
  }

  function updateCarousel() {
    const account = state.accounts.currentAccount; 
    if (!account) return;
    const { track, prevBtn, nextBtn, indicators } = elements.accounts.carousel;
    const totalSlides = account.images.length || 1;
    track.style.transform = `translateX(-${state.accounts.currentIndex * 100}%)`;
    prevBtn.disabled = totalSlides <= 1 || state.accounts.currentIndex === 0; 
    nextBtn.disabled = totalSlides <= 1 || state.accounts.currentIndex >= totalSlides - 1;
    
    indicators.querySelectorAll('.indicator-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === state.accounts.currentIndex);
    });
  }

  function initializeCarousel() {
    const { prevBtn, nextBtn, track } = elements.accounts.carousel;
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); if (state.accounts.currentIndex > 0) { state.accounts.currentIndex--; updateCarousel(); } });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); const account = state.accounts.currentAccount; if (!account) return; if (state.accounts.currentIndex < account.images.length - 1) { state.accounts.currentIndex++; updateCarousel(); } });
    let touchStartX = 0;
    track.addEventListener('touchstart', (e) => { e.stopPropagation(); touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    track.addEventListener('touchend', (e) => { e.stopPropagation(); const touchEndX = e.changedTouches[0].screenX; if (touchEndX < touchStartX - 50) nextBtn.click(); if (touchEndX > startX + 50) prevBtn.click(); }, { passive: true });
  }

  async function initializeAccounts() {
    if (state.accounts.initialized) return;
    const { customSelect, error, empty, display, buyBtn, offerBtn } = elements.accounts;
    error.style.display = 'none';
    try {
      const res = await fetch(getSheetUrl(config.sheets.accounts.name, 'csv'), { cache: 'no-store' });
      if (!res.ok) throw new Error(`Network error: ${res.statusText}`);
      const text = await res.text();
      state.accounts.data = await parseAccountsSheet(text);
      populateAccountSelect();
    } catch (err) {
      console.error('Fetch Accounts failed:', err);
      error.textContent = 'Gagal memuat data akun. Coba lagi nanti.'; error.style.display = 'block';
      empty.style.display = 'none'; 
      customSelect.value.textContent = 'Gagal memuat';
    }
    
    customSelect.btn.addEventListener('click', () => toggleCustomSelect(customSelect.wrapper));

    display.addEventListener('click', (e) => { if (!e.target.closest('.action-btn, .carousel-btn, .indicator-dot')) display.classList.toggle('expanded'); });
    buyBtn.addEventListener('click', (e) => { e.stopPropagation(); if (state.accounts.currentAccount) { openPaymentModal({ title: state.accounts.currentAccount.title, price: state.accounts.currentAccount.price, catLabel: 'Akun Game' }); } });
    offerBtn.addEventListener('click', (e) => { e.stopPropagation(); if (state.accounts.currentAccount) { const text = `Halo, saya tertarik untuk menawar Akun Game: ${state.accounts.currentAccount.title}`; window.open(`https://wa.me/${config.waNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener'); } });
    initializeCarousel();
    state.accounts.initialized = true;
  }
  
  function initializeApp() {
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('copy', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => { const now = new Date().getTime(); if (now - lastTouchEnd <= 300) e.preventDefault(); lastTouchEnd = now; }, false);

    elements.themeToggle?.addEventListener('click', toggleTheme);
    elements.sidebar.burger?.addEventListener('click', () => toggleSidebar());
    elements.sidebar.overlay?.addEventListener('click', () => toggleSidebar(false));
    elements.sidebar.links.forEach(link => {
      if(link.dataset.mode) {
        link.addEventListener('click', (e) => { e.preventDefault(); setMode(link.dataset.mode); });
      }
    });

    elements.layanan.customSelect.btn.addEventListener('click', () => toggleCustomSelect(elements.layanan.customSelect.wrapper));
    document.addEventListener('click', (e) => {
      if (!elements.layanan.customSelect.wrapper.contains(e.target)) toggleCustomSelect(elements.layanan.customSelect.wrapper, false);
      if (elements.preorder.customSelect.wrapper && !elements.preorder.customSelect.wrapper.contains(e.target)) toggleCustomSelect(elements.preorder.customSelect.wrapper, false);
      if (elements.accounts.customSelect.wrapper && !elements.accounts.customSelect.wrapper.contains(e.target)) toggleCustomSelect(elements.accounts.customSelect.wrapper, false);
    });
    
    let homeDebounce, layananDebounce;
    elements.home.searchInput.addEventListener('input', (e) => {
      clearTimeout(homeDebounce);
      homeDebounce = setTimeout(() => { state.home.searchQuery = e.target.value.trim().toLowerCase(); renderHomeList(); }, 200);
    });
    elements.layanan.searchInput.addEventListener('input', (e) => {
      clearTimeout(layananDebounce);
      layananDebounce = setTimeout(() => { state.layanan.searchQuery = e.target.value.trim().toLowerCase(); renderLayananList(); }, 200);
    });
    
    elements.paymentModal.closeBtn.addEventListener('click', closePaymentModal);
    elements.paymentModal.modal.addEventListener('click', (e) => { if (e.target === elements.paymentModal.modal) closePaymentModal(); });

    initTheme();
    loadCatalog();
  }

  document.addEventListener('DOMContentLoaded', initializeApp);
})();
