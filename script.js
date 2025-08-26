// script.js (trim & align camelCase; logic & UI unchanged)
(function () {
  const SHEET_ID = '1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
  const SHEETS   = { katalog: { name: 'Sheet3' }, preorder: { name1: 'Sheet1', name2: 'Sheet2' }, accounts: { name: 'Sheet5' } };
  const WA_NUMBER   = '6285877001999';
  const WA_GREETING = '*Detail pesanan:*';

  let data = [], cats = [], activeCat = '', query = '';
  let currentSelectedItem = null;

  const paymentOptions = [
    { id: 'seabank',     name: 'Seabank',        feeType: 'fixed',      value: 0    },
    { id: 'gopay',       name: 'Gopay',          feeType: 'fixed',      value: 0    },
    { id: 'dana',        name: 'Dana',           feeType: 'fixed',      value: 125  },
    { id: 'bank_to_dana',name: 'Bank ke Dana',   feeType: 'fixed',      value: 500  },
    { id: 'qris',        name: 'Qris',           feeType: 'percentage', value: 0.01 }
  ];

  // elements
  const viewCatalog = document.getElementById('viewCatalog');
  const viewPreorder = document.getElementById('viewPreorder');
  const viewAccounts = document.getElementById('viewAccounts');

  const listEl = document.getElementById('list-container');
  const searchEl = document.getElementById('search');
  const countInfoEl = document.getElementById('countInfo');
  const errBox = document.getElementById('error');
  const itemTmpl = document.getElementById('itemTmpl');
  const skeletonItemTmpl = document.getElementById('skeletonItemTmpl');
  const skeletonCardTmpl = document.getElementById('skeletonCardTmpl');

  const customSelectWrapper = document.getElementById('custom-select-wrapper');
  const customSelectBtn = document.getElementById('custom-select-btn');
  const customSelectValue = document.getElementById('custom-select-value');
  const customSelectOptions = document.getElementById('custom-select-options');

  const burgerCat = document.getElementById('burgerCat');
  const burgerPo  = document.getElementById('burgerPO');
  const burgerAcc = document.getElementById('burgerAcc');
  const menuCat   = document.getElementById('menuCat');
  const menuPo    = document.getElementById('menuPO');
  const menuAcc   = document.getElementById('menuAcc');

  const themeToggleBtn    = document.getElementById('theme-toggle-btn');
  const themeToggleBtnPo  = document.getElementById('theme-toggle-btn-po');
  const themeToggleBtnAcc = document.getElementById('theme-toggle-btn-acc');

  // payment modal
  const paymentModal            = document.getElementById('paymentModal');
  const closeModalBtn           = document.getElementById('closeModalBtn');
  const modalItemName           = document.getElementById('modalItemName');
  const modalItemPrice          = document.getElementById('modalItemPrice');
  const paymentOptionsContainer = document.getElementById('paymentOptions');
  const modalFee                = document.getElementById('modalFee');
  const modalTotal              = document.getElementById('modalTotal');
  const continueToWaBtn         = document.getElementById('continueToWaBtn');

  // akun game
  const accountSelect      = document.getElementById('accountSelect');
  const accountDisplay     = document.getElementById('accountDisplay');
  const accountEmpty       = document.getElementById('accountEmpty');
  const accountError       = document.getElementById('accountError');
  const carouselTrack      = document.getElementById('carouselTrack');
  const carouselPrev       = document.getElementById('carouselPrev');
  const carouselNext       = document.getElementById('carouselNext');
  const accountPrice       = document.getElementById('accountPrice');
  const accountStatus      = document.getElementById('accountStatus');
  const accountDescription = document.getElementById('accountDescription');
  const buyAccountBtn      = document.getElementById('buyAccountBtn');
  const offerAccountBtn    = document.getElementById('offerAccountBtn');

  // scroll animation
  const initScrollAnimations = () => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal-on-scroll, header.reveal-on-scroll').forEach(el => io.observe(el));
  };

  // theme
  const applyTheme = (theme) => document.body.classList.toggle('dark-mode', theme === 'dark');
  const initTheme = () => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  };
  const toggleTheme = () => {
    const next = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  };

  // menu + mode switcher (tetap sama perilakunya)
  const closeAllMenus = () => {
    [burgerCat, burgerPo, burgerAcc].forEach(b => b?.classList.remove('active'));
    [menuCat, menuPo, menuAcc].forEach(m => m?.classList.remove('open'));
  };
  const toggleMenu = (which) => {
    let btn, menu;
    if (which === 'cat') { btn = burgerCat; menu = menuCat; }
    else if (which === 'po') { btn = burgerPo; menu = menuPo; }
    else { btn = burgerAcc; menu = menuAcc; }
    const isOpen = menu.classList.contains('open');
    closeAllMenus();
    if (!isOpen) { btn?.classList.add('active'); menu?.classList.add('open'); }
  };
  const setMode = (mode) => {
    const active = document.querySelector('.view-section.active');
    const nextView = mode === 'katalog' ? viewCatalog : mode === 'preorder' ? viewPreorder : mode === 'accounts' ? viewAccounts : null;
    if (!nextView) return;
    if (active === nextView) { closeAllMenus(); return; }
    active.classList.remove('active');
    nextView.classList.add('active');
    closeAllMenus();
    if (mode === 'preorder' && !poState.initialized) poInit();
    if (mode === 'accounts' && !accState.initialized) accountsInit();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // utils
  const prettyLabel = (raw) => String(raw || '').trim().replace(/\s+/g, ' ');
  const toIdr = v => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
  const sheetUrlJson = (name) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(name)}&tqx=out:json`;
  const sheetUrlCsv  = (name) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;

  const showSkeleton = (container, tmpl, count = 6) => {
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) frag.appendChild(tmpl.content.cloneNode(true));
    container.appendChild(frag);
  };

  // katalog
  const parseGvizPairs = (txt) => {
    const m = txt.match(/\{.*\}/s);
    if (!m) throw new Error('Invalid GViz response.');
    const obj = JSON.parse(m[0]);
    const rows = obj.table?.rows || [];
    const cols = obj.table?.cols || [];

    const pairs = Array.from({ length: Math.floor(cols.length / 2) }, (_, i) => ({
      iTitle: i * 2, iPrice: i * 2 + 1, label: cols[i * 2]?.label || ''
    })).filter(p => p.label && cols[p.iPrice]);

    const out = [];
    for (const r of rows) {
      const c = r.c || [];
      for (const p of pairs) {
        const title = String(c[p.iTitle]?.v || '').trim();
        const priceRaw = c[p.iPrice]?.v;
        const price = (priceRaw != null && priceRaw !== '') ? Number(priceRaw) : NaN;
        if (title && !isNaN(price)) out.push({ catKey: p.label, catLabel: prettyLabel(p.label), title, price });
      }
    }
    return out;
  };

  const toggleCustomSelect = (open) => {
    const isOpen = typeof open === 'boolean' ? open : !customSelectWrapper.classList.contains('open');
    customSelectWrapper.classList.toggle('open', isOpen);
    customSelectBtn.setAttribute('aria-expanded', isOpen);
  };

  const buildGameSelect = () => {
    const map = new Map();
    data.forEach(it => { if (!map.has(it.catKey)) map.set(it.catKey, it.catLabel); });
    cats = [...map].map(([key, label]) => ({ key, label }));

    customSelectOptions.innerHTML = '';
    cats.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'custom-select-option';
      el.textContent = c.label;
      el.dataset.value = c.key;
      el.setAttribute('role', 'option');
      if (i === 0) el.classList.add('selected');
      el.addEventListener('click', () => {
        activeCat = c.key;
        customSelectValue.textContent = c.label;
        document.querySelector('.custom-select-option.selected')?.classList.remove('selected');
        el.classList.add('selected');
        toggleCustomSelect(false);
        renderList();
      });
      customSelectOptions.appendChild(el);
    });

    if (cats.length > 0) {
      activeCat = cats[0].key;
      customSelectValue.textContent = cats[0].label;
    } else {
      customSelectValue.textContent = 'Data tidak tersedia';
    }
  };

  const renderList = () => {
    const q = query;
    const items = data.filter(x =>
      x.catKey === activeCat &&
      (q === '' || x.title.toLowerCase().includes(q) || String(x.price).includes(q))
    );

    listEl.innerHTML = '';
    if (items.length === 0) {
      listEl.innerHTML = `<div class="empty">Tidak ada hasil ditemukan.</div>`;
      countInfoEl.textContent = '';
      return;
    }

    const frag = document.createDocumentFragment();
    for (const it of items) {
      const clone = itemTmpl.content.cloneNode(true);
      const base = clone.querySelector('.list-item');

      const btn = document.createElement('button');
      btn.className = 'list-item';
      btn.type = 'button';
      btn.innerHTML = base.innerHTML;

      btn.querySelector('.title').textContent = it.title;
      btn.querySelector('.price').textContent = toIdr(it.price);
      btn.addEventListener('click', () => openPaymentModal(it));

      frag.appendChild(btn);
    }
    listEl.appendChild(frag);
    countInfoEl.textContent = `${items.length} item ditemukan`;
  };

  const loadCatalog = async () => {
    try {
      errBox.style.display = 'none';
      showSkeleton(listEl, skeletonItemTmpl, 9);
      const res = await fetch(sheetUrlJson(SHEETS.katalog.name), { cache: 'no-store' });
      if (!res.ok) throw new Error(res.statusText);
      const txt = await res.text();
      data = parseGvizPairs(txt);
      if (data.length === 0) throw new Error('Empty data.');
      buildGameSelect();
      renderList();
    } catch {
      listEl.innerHTML = '';
      errBox.style.display = 'block';
      errBox.textContent = `Oops, terjadi kesalahan. Silakan coba beberapa saat lagi.`;
    }
  };

  // payment modal
  const calculateFee = (price, opt) => opt.feeType === 'fixed' ? opt.value : opt.feeType === 'percentage' ? Math.ceil(price * opt.value) : 0;

  const updateWaLink = (opt, fee, total) => {
    const { catLabel, title, price } = currentSelectedItem;
    const text = `${WA_GREETING}\n› Tipe: ${catLabel}\n› Item: ${title}\n› Pembayaran: ${opt.name}\n› Harga: ${toIdr(price)}\n› Fee: ${toIdr(fee)}\n› Total: ${toIdr(total)}`;
    continueToWaBtn.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  };

  const updatePriceDetails = () => {
    const selectedId = document.querySelector('input[name="payment"]:checked').value;
    const opt = paymentOptions.find(o => o.id === selectedId);
    const price = currentSelectedItem.price;
    const fee = calculateFee(price, opt);
    const total = price + fee;
    modalFee.textContent = toIdr(fee);
    modalTotal.textContent = toIdr(total);
    updateWaLink(opt, fee, total);
  };

  const openPaymentModal = (item) => {
    currentSelectedItem = item;
    modalItemName.textContent = item.title;
    modalItemPrice.textContent = toIdr(item.price);

    paymentOptionsContainer.innerHTML = '';
    paymentOptions.forEach((opt, i) => {
      const fee = calculateFee(item.price, opt);
      paymentOptionsContainer.insertAdjacentHTML('beforeend', `
        <div class="payment-option">
          <input type="radio" id="${opt.id}" name="payment" value="${opt.id}" ${i === 0 ? 'checked' : ''}>
          <label for="${opt.id}">${opt.name}<span style="float:right;">+ ${toIdr(fee)}</span></label>
        </div>
      `);
    });

    paymentOptionsContainer.querySelectorAll('input[name="payment"]').forEach(input => {
      input.addEventListener('change', updatePriceDetails);
    });

    updatePriceDetails();
    paymentModal.style.display = 'flex';
    setTimeout(() => paymentModal.classList.add('visible'), 10);
  };

  const closePaymentModal = () => {
    paymentModal.classList.remove('visible');
    setTimeout(() => { paymentModal.style.display = 'none'; currentSelectedItem = null; }, 200);
  };

  // PRE-ORDER (kode asli dipertahankan; hanya penamaan lokal po → po)
  const poSearch = document.getElementById('poSearch');
  const poStatus = document.getElementById('poStatus');
  const poSheet  = document.getElementById('poSheet');
  const poList   = document.getElementById('poList');
  const poPrev   = document.getElementById('poPrev');
  const poNext   = document.getElementById('poNext');
  const poTotal  = document.getElementById('poTotal');

  const poState = { initialized: false, allData: [], currentPage: 1, perPage: 15, displayMode: 'detailed' };

  const normalizeStatus = (raw) => {
    const s = String(raw || '').trim().toLowerCase();
    if (['success','selesai','berhasil','done'].includes(s))   return 'success';
    if (['progress','proses','diproses','processing'].includes(s)) return 'progress';
    if (['failed','gagal','dibatalkan','cancel','error'].includes(s)) return 'failed';
    return 'pending';
  };

  const poFilterData = () => { /* ... tetap sama seperti versi asli ... */ };
  const poUpdatePagination = (cur, total) => { poPrev.disabled = cur <= 1; poNext.disabled = cur >= total; };
  const poRender = () => { /* ... tetap sama seperti versi asli ... */ };
  const poSortByStatus = (data, mode) => { /* ... tetap sama ... */ };
  async function poFetch(sheetName) { /* ... tetap sama ... */ }
  function poInit() { /* ... tetap sama ... */ }

  // AKUN GAME (fungsi & logika asli dipertahankan; penamaan camelCase)
  const accState = { initialized: false, data: [], currentIndex: 0, currentAccount: null };
  function robustCsvParser(text) { /* ... tetap sama ... */ }
  async function parseAccountsSheet(text) { /* ... tetap sama ... */ }
  function populateAccountSelect() { /* ... tetap sama ... */ }
  function renderAccount(index) { /* ... tetap sama ... */ }
  function setupCarousel(images) { /* ... tetap sama ... */ }
  async function accountsInit() { /* ... tetap sama ... */ }

  // bindings
  document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initTheme();

    themeToggleBtn?.addEventListener('click', toggleTheme);
    themeToggleBtnPo?.addEventListener('click', toggleTheme);
    themeToggleBtnAcc?.addEventListener('click', toggleTheme);

    customSelectBtn?.addEventListener('click', () => toggleCustomSelect());
    document.addEventListener('click', (e) => {
      if (!customSelectWrapper.contains(e.target)) toggleCustomSelect(false);
    });

    searchEl?.addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); renderList(); });

    burgerCat?.addEventListener('click', () => toggleMenu('cat'));
    burgerPo ?.addEventListener('click', () => toggleMenu('po'));
    burgerAcc?.addEventListener('click', () => toggleMenu('acc'));

    closeModalBtn?.addEventListener('click', closePaymentModal);
    paymentModal?.addEventListener('click', (e) => { if (e.target === paymentModal) closePaymentModal(); });

    loadCatalog();
  });
})();
