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
      currentAccount: null,
      modalCarouselIndex: 0,
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
    pageTitles: document.querySelectorAll('.page-title'),
    
    viewHome: getElement('viewHome'),
    viewLayanan: getElement('viewLayanan'),
    viewPreorder: getElement('viewPreorder'),
    viewAccounts: getElement('viewAccounts'),
    
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
      sheetSelect: getElement('preorderSheetSelect'),
      listContainer: getElement('preorderListContainer'),
      prevBtn: getElement('preorderPrevBtn'),
      nextBtn: getElement('preorderNextBtn'),
      total: getElement('preorderTotal'),
    },
    accounts: {
      gridContainer: getElement('accountGridContainer'),
      cardTemplate: getElement('accountCardTemplate'),
      error: getElement('accountError'),
      modal: getElement('accountDetailModal'),
      closeModalBtn: getElement('closeAccountModalBtn'),
      modalTitle: getElement('accountModalTitle'),
      modalPrice: getElement('accountModalPrice'),
      modalStatus: getElement('accountModalStatus'),
      modalDescription: getElement('accountModalDescription'),
      buyBtn: getElement('buyAccountBtn'),
      offerBtn: getElement('offerAccountBtn'),
      carousel: {
        track: getElement('accountModalCarouselTrack'),
        prevBtn: getElement('accountModalCarouselPrevBtn'),
        nextBtn: getElement('accountModalCarouselNextBtn'),
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
    };
    const nextView = viewMap[nextMode];
    if (!nextView) return;

    document.querySelector('.view-section.active')?.classList.remove('active');
    nextView.classList.add('active');
    
    elements.sidebar.links.forEach(link => {
        link.classList.toggle('active', link.dataset.mode === nextMode);
    });

    elements.pageTitles.forEach(title => {
        title.classList.toggle('active', title.dataset.mode === nextMode);
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

  function toggleCustomSelect(forceOpen) {
    const { wrapper, btn } = elements.layanan.customSelect;
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
        options.querySelector('.custom-select-option.selected')?.classList.remove('selected');
        el.classList.add('selected');
        toggleCustomSelect(false);
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
      container.innerHTML = `<div class="empty">${emptyText}</div>`;
      countInfoEl.textContent = '';
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
      listContainer.innerHTML = `<div class="empty">Tidak Ada Hasil Ditemukan</div>`;
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
        
        card.className = `card ${detailsHtml ? 'clickable' : ''}`;
        card.innerHTML = `
          <div class="card-header">
            <div>
              <div class="card-name">${name || 'Tanpa Nama'}</div>
              <div class="card-product">${product || 'N/A'}</div>
            </div>
            <div class="status-badge ${status}">${(statusRaw || 'Pending').toUpperCase()}</div>
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
    const { searchInput, statusSelect, sheetSelect, prevBtn, nextBtn } = elements.preorder;
    searchInput.addEventListener('input', rebound);
    statusSelect.addEventListener('change', rebound);
    sheetSelect.addEventListener('change', (e) => {
      const sheet = e.target.value === '0' ? config.sheets.preorder.name1 : config.sheets.preorder.name2;
      fetchPreorderData(sheet);
    });
    prevBtn.addEventListener('click', () => { if (state.preorder.currentPage > 1) { state.preorder.currentPage--; renderPreorderCards(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    nextBtn.addEventListener('click', () => { state.preorder.currentPage++; renderPreorderCards(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    const initialSheet = sheetSelect.value === '0' ? config.sheets.preorder.name1 : config.sheets.preorder.name2;
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

  function renderAccountGrid() {
      const { gridContainer, cardTemplate } = elements.accounts;
      if (state.accounts.data.length === 0) {
          gridContainer.innerHTML = `<div class="empty">Tidak ada akun yang tersedia saat ini.</div>`;
          return;
      }

      const fragment = document.createDocumentFragment();
      state.accounts.data.forEach(account => {
          const clone = cardTemplate.content.cloneNode(true);
          const card = clone.querySelector('.account-card');
          const image = clone.querySelector('.account-card-image');
          
          clone.querySelector('.account-card-title').textContent = account.title;
          clone.querySelector('.account-card-price').textContent = formatToIdr(account.price);
          clone.querySelector('.account-card-status').textContent = account.status;
          
          image.src = account.images[0] || 'placeholder.png'; // Use a placeholder if no image
          image.alt = `Gambar untuk ${account.title}`;
          
          card.addEventListener('click', () => openAccountModal(account));
          fragment.appendChild(clone);
      });
      gridContainer.innerHTML = '';
      gridContainer.appendChild(fragment);
  }

  function openAccountModal(account) {
    state.accounts.currentAccount = account;
    state.accounts.modalCarouselIndex = 0;
    
    const { modal, modalTitle, modalPrice, modalStatus, modalDescription, buyBtn, offerBtn } = elements.accounts;
    modalTitle.textContent = account.title;
    modalPrice.textContent = formatToIdr(account.price);
    modalStatus.textContent = account.status;
    modalStatus.className = 'account-status-badge';
    modalStatus.classList.add(account.status.toLowerCase() === 'tersedia' ? 'available' : 'sold');
    modalDescription.textContent = account.description;

    buyBtn.onclick = (e) => {
        e.stopPropagation();
        openPaymentModal({ title: account.title, price: account.price, catLabel: 'Akun Game' });
    };
    offerBtn.onclick = (e) => {
        e.stopPropagation();
        const text = `Halo, saya tertarik untuk menawar Akun Game: ${account.title}`;
        window.open(`https://wa.me/${config.waNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    };

    updateAccountModalCarousel();
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.
