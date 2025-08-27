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

  function openPaymentModal(item) {
    currentSelectedItem = item;
    const { modal, itemName, itemPrice, optionsContainer } = elements.paymentModal;
    itemName.textContent = item.title;
    itemPrice.textContent = formatToIdr(item.price);
    optionsContainer.innerHTML = '';

    config.paymentOptions.forEach((option, index) => {
      const fee = option.feeType === 'fixed' ? option.value : Math.ceil(item.price * option.value);
      optionsContainer.insertAdjacentHTML('beforeend', `
        <div class="payment-option">
          <input type="radio" id="${option.id}" name="payment" value="${option.id}" ${index === 0 ? 'checked' : ''}>
          <label for="${option.id}">
            ${option.name} <span style="float: right;">+ ${formatToIdr(fee)}</span>
          </label>
        </div>`);
    });

    function updateDetails() {
        const selectedOptionId = document.querySelector('input[name="payment"]:checked').value;
        const selectedOption = config.paymentOptions.find((opt) => opt.id === selectedOptionId);
        const price = currentSelectedItem.price;
        const fee = selectedOption.feeType === 'fixed' ? selectedOption.value : Math.ceil(price * selectedOption.value);
        const total = price + fee;

        elements.paymentModal.fee.textContent = formatToIdr(fee);
        elements.paymentModal.total.textContent = formatToIdr(total);
        const text = [
            config.waGreeting, `› Item: ${item.title}`, `› Pembayaran: ${selectedOption.name}`,
            `› Harga: ${formatToIdr(price)}`, `› Fee: ${formatToIdr(fee)}`, `› Total: ${formatToIdr(total)}`,
        ].join('\n');
        elements.paymentModal.waBtn.href = `https://wa.me/${config.waNumber}?text=${encodeURIComponent(text)}`;
    }

    optionsContainer.querySelectorAll('input[name="payment"]').forEach((input) => input.addEventListener('change', updateDetails));
    updateDetails();
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
  }

  function closePaymentModal() {
    const { modal } = elements.paymentModal;
    modal.classList.remove('visible');
    setTimeout(() => { modal.style.display = 'none'; currentSelectedItem = null; }, 200);
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
      gridContainer.innerHTML = '';
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
          
          image.src = account.images[0] || '';
          image.alt = `Gambar untuk ${account.title}`;
          image.onerror = function() {
              this.src = 'https://via.placeholder.com/300x169.png?text=Gambar+Tidak+Tersedia';
              this.alt = 'Gambar tidak tersedia';
          };
          
          card.addEventListener('click', () => openAccountModal(account));
          fragment.appendChild(clone);
      });
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
    setTimeout(() => modal.classList.add('visible'), 10);
  }

  function closeAccountModal() {
      const { modal } = elements.accounts;
      modal.classList.remove('visible');
      setTimeout(() => {
          modal.style.display = 'none';
          state.accounts.currentAccount = null;
      }, 200);
  }

  function updateAccountModalCarousel() {
      const account = state.accounts.currentAccount;
      if (!account) return;

      const { track, prevBtn, nextBtn } = elements.accounts.carousel;
      track.innerHTML = '';

      if (account.images && account.images.length > 0) {
          account.images.forEach(src => {
              track.insertAdjacentHTML('beforeend', `<div class="carousel-slide"><img src="${src}" alt="Gambar untuk ${account.title}" loading="lazy"></div>`);
          });
      } else {
          track.insertAdjacentHTML('beforeend', `<div class="carousel-slide"><div style="display:flex;align-items:center;justify-content:center;height:100%;aspect-ratio:16/9;background-color:var(--surface-secondary);color:var(--text-tertiary);">Gambar tidak tersedia</div></div>`);
      }
      
      const totalSlides = account.images.length || 1;
      track.style.transform = `translateX(-${state.accounts.modalCarouselIndex * 100}%)`;
      prevBtn.disabled = totalSlides <= 1 || state.accounts.modalCarouselIndex === 0;
      nextBtn.disabled = totalSlides <= 1 || state.accounts.modalCarouselIndex >= totalSlides - 1;
  }

  async function initializeAccounts() {
    if (state.accounts.initialized) return;
    state.accounts.initialized = true;
    
    const { gridContainer, error } = elements.accounts;
    showSkeleton(gridContainer, elements.skeletonCardTemplate, 4); 
    error.style.display = 'none';

    try {
      const res = await fetch(getSheetUrl(config.sheets.accounts.name, 'csv'), { cache: 'no-store' });
      if (!res.ok) throw new Error(`Network error: ${res.statusText}`);
      const text = await res.text();
      state.accounts.data = await parseAccountsSheet(text);
      renderAccountGrid();
    } catch (err) {
      console.error('Fetch Accounts failed:', err);
      gridContainer.innerHTML = '';
      error.textContent = 'Gagal memuat data akun. Coba lagi nanti.';
      error.style.display = 'block';
    }
  }

  function initializeApp() {
    // --- CORE EVENT LISTENERS ---
    elements.sidebar.burger?.addEventListener('click', () => toggleSidebar());
    elements.sidebar.overlay?.addEventListener('click', () => toggleSidebar(false));

    elements.themeToggle?.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    elements.sidebar.links.forEach(link => {
      if(link.dataset.mode) {
        link.addEventListener('click', (e) => { e.preventDefault(); setMode(link.dataset.mode); });
      }
    });

    elements.paymentModal.closeBtn.addEventListener('click', closePaymentModal);
    elements.paymentModal.modal.addEventListener('click', (e) => { if (e.target === elements.paymentModal.modal) closePaymentModal(); });

    elements.accounts.closeModalBtn.addEventListener('click', closeAccountModal);
    elements.accounts.modal.addEventListener('click', (e) => { if (e.target === elements.accounts.modal) closeAccountModal(); });
    
    const { prevBtn, nextBtn } = elements.accounts.carousel;
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.accounts.modalCarouselIndex > 0) {
            state.accounts.modalCarouselIndex--;
            updateAccountModalCarousel();
        }
    });
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const account = state.accounts.currentAccount;
        if (account && state.accounts.modalCarouselIndex < account.images.length - 1) {
            state.accounts.modalCarouselIndex++;
            updateAccountModalCarousel();
        }
    });
    
    elements.layanan.customSelect.btn.addEventListener('click', () => toggleCustomSelect());
    document.addEventListener('click', (e) => {
      if (!elements.layanan.customSelect.wrapper.contains(e.target)) {
        toggleCustomSelect(false);
      }
    });
    
    let homeDebounce, layananDebounce;
    elements.home.searchInput.addEventListener('input', (e) => {
      clearTimeout(homeDebounce);
      elements.home.listContainer.classList.add('filtering');
      homeDebounce = setTimeout(() => {
        state.home.searchQuery = e.target.value.trim().toLowerCase();
        renderHomeList();
        elements.home.listContainer.classList.remove('filtering');
      }, 300);
    });
    elements.layanan.searchInput.addEventListener('input', (e) => {
      clearTimeout(layananDebounce);
      elements.layanan.listContainer.classList.add('filtering');
      layananDebounce = setTimeout(() => {
        state.layanan.searchQuery = e.target.value.trim().toLowerCase();
        renderLayananList();
        elements.layanan.listContainer.classList.remove('filtering');
      }, 300);
    });


    // --- INITIALIZATION ---
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(currentTheme);

    loadCatalog();
    setMode('home');
  }

  document.addEventListener('DOMContentLoaded', initializeApp);
})();
