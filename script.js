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
    menuItems: [
      { label: 'Katalog', mode: 'katalog' },
      { label: 'Lacak Pre‑Order', mode: 'preorder' },
      { label: 'Akun Game', mode: 'accounts' },
      { divider: true },
      { label: 'Donasi (Saweria)', href: 'https://saweria.co/playpal' },
      { divider: true },
      { label: 'Tutup', mode: 'close' },
    ],
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
    menuOverlay: getElement('menuOverlay'), // <-- DITAMBAHKAN
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

  function closeAllMenus() {
    Object.values(elements.burgers).forEach((b) => b?.classList.remove('active'));
    Object.values(elements.menus).forEach((m) => m?.classList.remove('open'));
    elements.menuOverlay?.classList.remove('open'); // <-- DITAMBAHKAN
  }

  function renderMenu(container) {
    container.innerHTML = '';
    config.menuItems.forEach((item) => {
      if (item.divider) {
        const divider = document.createElement('div');
        divider.className = 'menu-divider';
        container.appendChild(divider);
        return;
      }

      const btn = document.createElement('button');
      btn.className = 'menu-btn';
      btn.textContent = item.label;

      if (item.href) {
        btn.addEventListener('click', () => window.open(item.href, '_blank', 'noopener'));
      } else if (item.mode === 'close') {
        btn.addEventListener('click', closeAllMenus);
      } else {
        btn.addEventListener('click', () => setMode(item.mode));
      }
      container.appendChild(btn);
    });
  }

  function toggleMenu(menuType) {
    const btn = elements.burgers[menuType];
    const menu = elements.menus[menuType];
    const isOpen = menu?.classList.contains('open');
    closeAllMenus();
    if (!isOpen) {
      btn?.classList.add('active');
      menu?.classList.add('open');
      elements.menuOverlay?.classList.add('open'); // <-- DITAMBAHKAN
    }
  }

  function setMode(nextMode) {
    const currentActive = document.querySelector('.view-section.active');
    const viewMap = {
      katalog: elements.viewCatalog,
      preorder: elements.viewPreorder,
      accounts: elements.viewAccounts,
    };
    const nextView = viewMap[nextMode];

    if (!nextView || currentActive === nextView) {
      closeAllMenus();
      return;
    }

    currentActive?.classList.remove('active');
    nextView.classList.add('active');
    closeAllMenus();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (nextMode === 'preorder' && !state.preorder.initialized) {
      initializePreorder();
    }
    if (nextMode === 'accounts' && !state.accounts.initialized) {
      initializeAccounts();
    }
  }

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

  function calculateFee(price, option) {
    if (option.feeType === 'fixed') {
      return option.value;
    }
    if (option.feeType === 'percentage') {
      return Math.ceil(price * option.value);
    }
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
      config.waGreeting,
      `› Tipe: ${catLabel}`,
      `› Item: ${title}`,
      `› Pembayaran: ${option.name}`,
      `› Harga: ${formatToIdr(price)}`,
      `› Fee: ${formatToIdr(fee)}`,
      `› Total: ${formatToIdr(total)}`,
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
      const isChecked = index === 0;
      const fee = calculateFee(item.price, option);
      const optionHtml = `
        <div class="payment-option">
          <input type="radio" id="${option.id}" name="payment" value="${option.id}" ${isChecked ? 'checked' : ''}>
          <label for="${option.id}">
            ${option.name} 
            <span style="float: right;">+ ${formatToIdr(fee)}</span>
          </label>
        </div>`;
      optionsContainer.insertAdjacentHTML('beforeend', optionHtml);
    });

    optionsContainer
      .querySelectorAll('input[name="payment"]')
      .forEach((input) => input.addEventListener('change', updatePriceDetails));

    updatePriceDetails();
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
  }

  function closePaymentModal() {
    const { modal } = elements.paymentModal;
    modal.classList.remove('visible');
    setTimeout(() => {
      modal.style.display = 'none';
      currentSelectedItem = null;
    }, 200);
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

    total.textContent = `${totalItems} total pesanan${
      filtered.length !== totalItems ? `, ${filtered.length} ditemukan` : ''
    }`;

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
        const detailsHtml = details
          .filter((d) => d.value && String(d.value).trim() !== '')
          .map(d => `<div class="detail-item"><div class="detail-label">${d.label}</div><div class="detail-value">${d.value}</div></div>`)
          .join('');
        
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
        
        if (detailsHtml) {
          card.addEventListener('click', () => card.classList.toggle('expanded'));
        }
      } else {
        const [orderNum, product, statusRaw] = item;
        const status = normalizeStatus(statusRaw);
        card.className = 'card';
        card.innerHTML = `
          <div class="card-header">
            <div>
              <div class="card-name">${orderNum || 'Tanpa Nomor'}</div>
              <div class="card-product">${product || 'N/A'}</div>
            </div>
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

    const rebound = () => {
      state.preorder.currentPage = 1;
      renderPreorderCards();
    };

    const { searchInput, statusSelect, sheetSelect, prevBtn, nextBtn } = elements.preorder;
    searchInput.addEventListener('input', rebound);
    statusSelect.addEventListener('change', rebound);
    sheetSelect.addEventListener('change', (e) => {
      const sheet = e.target.value === '0' ? config.sheets.preorder.name1 : config.sheets.preorder.name2;
      fetchPreorderData(sheet);
    });

    prevBtn.addEventListener('click', () => {
      if (state.preorder.currentPage > 1) {
        state.preorder.currentPage--;
        renderPreorderCards();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    nextBtn.addEventListener('click', () => {
      state.preorder.currentPage++;
      renderPreorderCards();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    const initialSheet = sheetSelect.value === '0' ? config.sheets.preorder.name1 : config.sheets.preorder.name2;
    fetchPreorderData(initialSheet);
    state.preorder.initialized = true;
  }

  function robustCsvParser(text) {
    const normalizedText = text.trim().replace(/\r\n/g, '\n');
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotedField = false;

    for (let i = 0; i < normalizedText.length; i++) {
      const char = normalizedText[i];
      if (inQuotedField) {
        if (char === '"') {
          if (i + 1 < normalizedText.length && normalizedText[i + 1] === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotedField = false;
          }
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotedField = true;
        } else if (char === ',') {
          currentRow.push(currentField);
          currentField = '';
        } else if (char === '\n') {
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
        } else {
          currentField += char;
        }
      }
    }
    currentRow.push(currentField);
    rows.push(currentRow);
    return rows;
  }

  async function parseAccountsSheet(text) {
    const rows = robustCsvParser(text);
    rows.shift();
    const accounts = [];
    for (const row of rows) {
      if (!row || row.length < 5 || !row[0]) continue;
      accounts.push({
        title: row[0] || 'Tanpa Judul',
        price: Number(row[1]) || 0,
        status: row[2] || 'Tersedia',
        description: row[3] || 'Tidak ada deskripsi.',
        images: (row[4] || '').split(',').map((url) => url.trim()).filter(Boolean),
      });
    }
    return accounts;
  }

  function populateAccountSelect() {
    const { select, empty } = elements.accounts;
    select.innerHTML = '<option value="">Pilih Akun</option>';
    if (state.accounts.data.length === 0) {
      select.innerHTML = '<option value="">Tidak ada akun</option>';
      empty.textContent = 'Tidak ada akun yang tersedia saat ini.';
      empty.style.display = 'block';
      return;
    }
    state.accounts.data.forEach((acc, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = acc.title;
      select.appendChild(option);
    });
  }

  function renderAccount(index) {
    const { display, empty, price, description, status: statusEl } = elements.accounts;
    const account = state.accounts.data[index];
    state.accounts.currentAccount = account;

    if (!account) {
      display.style.display = 'none';
      empty.style.display = 'block';
      return;
    }

    display.classList.remove('expanded');
    price.textContent = formatToIdr(account.price);
    description.textContent = account.description;
    statusEl.textContent = account.status;
    statusEl.className = 'account-status-badge';
    statusEl.classList.add(account.status.toLowerCase() === 'tersedia' ? 'available' : 'sold');

    const { track } = elements.accounts.carousel;
    track.innerHTML = '';
    if (account.images && account.images.length > 0) {
      account.images.forEach((src) => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Gambar untuk ${account.title}`;
        img.loading = 'lazy';
        slide.appendChild(img);
        track.appendChild(slide);
      });
    } else {
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      const placeholder = document.createElement('div');
      placeholder.style.cssText = `
        display:flex; 
        align-items:center; 
        justify-content:center; 
        height:100%; 
        aspect-ratio:16/9; 
        background-color: var(--surface-secondary); 
        color: var(--text-tertiary);`;
      placeholder.textContent = 'Gambar tidak tersedia';
      slide.appendChild(placeholder);
      track.appendChild(slide);
    }

    state.accounts.currentIndex = 0;
    updateCarousel();
    empty.style.display = 'none';
    display.style.display = 'block';
  }

  function updateCarousel() {
    const { select } = elements.accounts;
    if (select.value === '') return;
    const account = state.accounts.data[select.value];
    if (!account) return;

    const { track, prevBtn, nextBtn } = elements.accounts.carousel;
    const totalSlides = account.images.length || 1;
    track.style.transform = `translateX(-${state.accounts.currentIndex * 100}%)`;
    prevBtn.disabled = totalSlides <= 1;
    nextBtn.disabled = totalSlides <= 1 || state.accounts.currentIndex >= totalSlides - 1;
  }

  function initializeCarousel() {
    const { prevBtn, nextBtn, track } = elements.accounts.carousel;
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.accounts.currentIndex > 0) {
        state.accounts.currentIndex--;
        updateCarousel();
      }
    });

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const account = state.accounts.currentAccount;
      if (!account) return;
      const totalSlides = account.images.length;
      if (state.accounts.currentIndex < totalSlides - 1) {
        state.accounts.currentIndex++;
        updateCarousel();
      }
    });

    let touchStartX = 0;
    track.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
      e.stopPropagation();
      const touchEndX = e.changedTouches[0].screenX;
      if (touchEndX < touchStartX - 50) nextBtn.click();
      if (touchEndX > touchStartX + 50) prevBtn.click();
    }, { passive: true });
  }

  async function initializeAccounts() {
    if (state.accounts.initialized) return;
    const { select, error, empty, display, buyBtn, offerBtn } = elements.accounts;
    error.style.display = 'none';

    try {
      const res = await fetch(getSheetUrl(config.sheets.accounts.name, 'csv'), { cache: 'no-store' });
      if (!res.ok) throw new Error(`Network error: ${res.statusText}`);
      const text = await res.text();
      state.accounts.data = await parseAccountsSheet(text);
      populateAccountSelect();
    } catch (err) {
      console.error('Fetch Accounts failed:', err);
      error.textContent = 'Gagal memuat data akun. Coba lagi nanti.';
      error.style.display = 'block';
      empty.style.display = 'none';
      select.innerHTML = '<option value="">Gagal memuat</option>';
    }

    select.addEventListener('change', (e) => {
      if (e.target.value !== '') {
        renderAccount(parseInt(e.target.value, 10));
      } else {
        display.style.display = 'none';
        empty.style.display = 'block';
        state.accounts.currentAccount = null;
      }
    });

    display.addEventListener('click', (e) => {
      if (e.target.closest('.action-btn, .carousel-btn')) return;
      display.classList.toggle('expanded');
    });

    buyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.accounts.currentAccount) {
        openPaymentModal({
          title: state.accounts.currentAccount.title,
          price: state.accounts.currentAccount.price,
          catLabel: 'Akun Game',
        });
      }
    });

    offerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.accounts.currentAccount) {
        const text = `Halo, saya tertarik untuk menawar Akun Game: ${state.accounts.currentAccount.title}`;
        window.open(`https://wa.me/${config.waNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      }
    });

    initializeCarousel();
    state.accounts.initialized = true;
  }
  
  function initializeApp() {
    document.addEventListener('contextmenu', (event) => event.preventDefault());
    document.addEventListener('copy', (event) => event.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('touchstart', (event) => {
      if (event.touches.length > 1) event.preventDefault();
    }, { passive: false });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = new Date().getTime();
      if (now - lastTouchEnd <= 300) event.preventDefault();
      lastTouchEnd = now;
    }, false);

    elements.menuOverlay?.addEventListener('click', closeAllMenus); // <-- DITAMBAHKAN

    elements.burgers.cat?.addEventListener('click', () => toggleMenu('cat'));
    elements.burgers.po?.addEventListener('click', () => toggleMenu('po'));
    elements.burgers.acc?.addEventListener('click', () => toggleMenu('acc'));
    Object.values(elements.themeToggles).forEach((btn) => btn?.addEventListener('click', toggleTheme));

    document.addEventListener('click', (e) => {
      const isOutsideMenu = ![...Object.values(elements.menus), ...Object.values(elements.burgers)]
        .some((el) => el?.contains(e.target));
      if (isOutsideMenu) closeAllMenus();
    });
    
    elements.customSelect.btn.addEventListener('click', () => toggleCustomSelect());
    document.addEventListener('click', (e) => {
      if (!elements.customSelect.wrapper.contains(e.target)) {
        toggleCustomSelect(false);
      }
    });
    
    let debounceTimer;
    elements.searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderCatalogList();
      }, 200);
    });
    
    elements.paymentModal.closeBtn.addEventListener('click', closePaymentModal);
    elements.paymentModal.modal.addEventListener('click', (e) => {
      if (e.target === elements.paymentModal.modal) closePaymentModal();
    });

    renderMenu(elements.menus.cat);
    renderMenu(elements.menus.po);
    renderMenu(elements.menus.acc);
    initTheme();
    loadCatalog();
    initScrollAnimations();
  }

  document.addEventListener('DOMContentLoaded', initializeApp);
})();
