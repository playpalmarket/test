(function () {
  // ===================== CONFIG =====================
  const SHEET_ID = '1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
  const SHEETS = {
    katalog: { name: 'Sheet3' },
    preorder: { name1: 'Sheet1', name2: 'Sheet2' }
  };

  // Nomor WA tujuan + teks awal (silakan ubah sendiri)
  const WA_NUMBER = '6285877001999';
  const WA_GREETING = '*Detail pesanan:*';

  // ===================== HELPERS =====================
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];
  const pretty = (s) => String(s || '').trim().replace(/\s+/g, ' ');

  const gvizJSON = (sheet) =>
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
      sheet
    )}`;
  const gvizCSV = (sheetZeroIndex) =>
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet${
      sheetZeroIndex + 1
    }`;

  const toIDR = (v) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(v);

  // ===================== DOM HOOKS =====================
  const viewCatalog = qs('#viewCatalog');
  const viewPreorder = qs('#viewPreorder');

  // Katalog
  const listEl = qs('#list-container');
  const searchEl = qs('#search');
  const countInfoEl = qs('#countInfo');
  const itemTmpl = qs('#itemTmpl');
  const errBox = qs('#error');

  const customSelectWrapper = qs('#custom-select-wrapper');
  const customSelectBtn = qs('#custom-select-btn');
  const customSelectValue = qs('#custom-select-value');
  const customSelectOptions = qs('#custom-select-options');

  // Burger
  const burgerCat = qs('#burgerCat');
  const burgerPO = qs('#burgerPO');
  const menuCat = qs('#menuCat');
  const menuPO = qs('#menuPO');

  // Pre‑Order
  const poSearch = qs('#poSearch');
  const poStatus = qs('#poStatus');
  const poSheet = qs('#poSheet');
  const poList = qs('#poList');
  const poPrev = qs('#poPrev');
  const poNext = qs('#poNext');
  const poTotal = qs('#poTotal');

  // ===================== STATE =====================
  // Katalog
  let DATA = []; // {catKey, catLabel, title, priceRaw, priceText}
  let CATS = []; // {key,label}
  let activeCat = '';
  let query = '';

  // Pre‑order
  const poState = {
    initialized: false,
    allData: [],
    currentPage: 1,
    perPage: 15
  };

  // ===================== MENU & MODE =====================
  function closeAllMenus() {
    [menuCat, menuPO].forEach((m) => m && m.classList.remove('open'));
    [burgerCat, burgerPO].forEach((b) => b && b.classList.remove('active'));
  }
  function toggleMenu(which) {
    const btn = which === 'cat' ? burgerCat : burgerPO;
    const menu = which === 'cat' ? menuCat : menuPO;
    const open = menu.classList.contains('open');
    closeAllMenus();
    if (!open) {
      btn?.classList.add('active');
      menu?.classList.add('open');
    }
  }
  burgerCat?.addEventListener('click', () => toggleMenu('cat'));
  burgerPO?.addEventListener('click', () => toggleMenu('po'));
  document.addEventListener('click', (e) => {
    const inside =
      menuCat?.contains(e.target) ||
      burgerCat?.contains(e.target) ||
      menuPO?.contains(e.target) ||
      burgerPO?.contains(e.target);
    if (!inside) closeAllMenus();
  });

  function setMode(next) {
    viewCatalog.style.display = next === 'katalog' ? 'block' : 'none';
    viewPreorder.style.display = next === 'preorder' ? 'block' : 'none';
    closeAllMenus();
    if (next === 'preorder' && !poState.initialized) poInit();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // tombol pada menu
  [...qsa('#menuCat .menu-btn'), ...qsa('#menuPO .menu-btn')].forEach((b) =>
    b.addEventListener('click', () => setMode(b.dataset.mode))
  );

  // ===================== KATALOG (Sheet3) =====================
  // Parser GViz: baca pasangan kolom (judul,harga) per kategori
  function parseGVizPairs(txt) {
    // format: /*O_o*/google.visualization.Query.setResponse({...});
    const jsonMatch = txt.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error('GViz format tidak valid.');
    const obj = JSON.parse(jsonMatch[0]);
    const table = obj.table || {};
    const rows = table.rows || [];
    const cols = table.cols || [];

    // Pasangan kolom [0,1], [2,3], ...
    const pairs = Array.from(
      { length: Math.floor(cols.length / 2) },
      (_, i) => ({
        iTitle: i * 2,
        iPrice: i * 2 + 1,
        label: pretty(cols[i * 2]?.label || '')
      })
    ).filter((p) => p.label && cols[p.iPrice]);

    const out = [];
    for (const r of rows) {
      const c = r.c || [];
      for (const p of pairs) {
        const title = pretty(c[p.iTitle]?.v ?? '');
        const priceRaw = c[p.iPrice]?.v ?? '';
        if (!title) continue;

        // Terima harga angka ATAU string (mis: "Rp4.126")
        const isNum = typeof priceRaw === 'number';
        const priceText = isNum ? toIDR(Number(priceRaw)) : String(priceRaw).trim();

        out.push({
          catKey: p.label,
          catLabel: p.label,
          title,
          priceRaw,
          priceText
        });
      }
    }
    return out;
  }

  function toggleCustomSelect(open) {
    const isOpen =
      typeof open === 'boolean'
        ? open
        : !customSelectWrapper.classList.contains('open');
    customSelectWrapper.classList.toggle('open', isOpen);
    customSelectBtn.setAttribute('aria-expanded', String(isOpen));
  }
  customSelectBtn?.addEventListener('click', () => toggleCustomSelect());
  document.addEventListener('click', (e) => {
    if (
      customSelectWrapper &&
      !customSelectWrapper.contains(e.target) &&
      !customSelectBtn.contains(e.target)
    )
      toggleCustomSelect(false);
  });

  function buildGameSelect() {
    const map = new Map();
    DATA.forEach((it) => {
      if (!map.has(it.catKey)) map.set(it.catKey, it.catLabel);
    });
    CATS = [...map].map(([key, label]) => ({ key, label }));

    customSelectOptions.innerHTML = '';
    CATS.forEach((c, idx) => {
      const el = document.createElement('div');
      el.className = 'custom-select-option';
      el.textContent = c.label;
      el.dataset.value = c.key;
      el.setAttribute('role', 'option');
      if (idx === 0) el.classList.add('selected');
      el.addEventListener('click', () => {
        activeCat = c.key;
        customSelectValue.textContent = c.label;
        qs('.custom-select-option.selected', customSelectOptions)?.classList.remove(
          'selected'
        );
        el.classList.add('selected');
        toggleCustomSelect(false);
        renderList();
      });
      customSelectOptions.appendChild(el);
    });

    if (CATS.length > 0) {
      activeCat = CATS[0].key;
      customSelectValue.textContent = CATS[0].label;
    } else {
      customSelectValue.textContent = 'Data tidak tersedia';
    }
  }

  function renderList() {
    const items = DATA.filter(
      (x) =>
        x.catKey === activeCat &&
        (query === '' ||
          x.title.toLowerCase().includes(query) ||
          String(x.priceRaw).toLowerCase().includes(query))
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
      const link = clone.querySelector('.list-item');

      clone.querySelector('.title').textContent = it.title || '(Tanpa judul)';
      clone.querySelector('.price').textContent = it.priceText || '';

      const text =
        `${WA_GREETING}\n` +
        `› Tipe: Katalog\n` +
        `› Game: ${it.catLabel}\n` +
        `› Item: ${it.title}\n` +
        `› Harga: ${it.priceText}`;

      link.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
      frag.appendChild(clone);
    }
    listEl.appendChild(frag);
    countInfoEl.textContent = `${items.length} item`;
  }

  let debounceTimer;
  searchEl?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      query = e.target.value.trim().toLowerCase();
      renderList();
    }, 200);
  });

  async function loadCatalog() {
    try {
      errBox.style.display = 'none';
      listEl.innerHTML = `<div class="empty">Memuat katalog...</div>`;
      const res = await fetch(gvizJSON(SHEETS.katalog.name), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const txt = await res.text();
      DATA = parseGVizPairs(txt);
      if (DATA.length === 0) throw new Error('Data kosong / format tidak sesuai.');
      buildGameSelect();
      renderList();
    } catch (err) {
      console.error('Katalog error:', err);
      errBox.style.display = 'block';
      errBox.textContent = `Gagal memuat data: ${err.message}`;
    }
  }

  // ===================== PRE‑ORDER (Sheet1 & Sheet2) =====================
  const PRIVACY_KEYS = [
    'id gift',
    'gift id',
    'gift',
    'nomor',
    'no',
    'telepon',
    'no telepon',
    'no. telepon',
    'nomor telepon',
    'phone',
    'hp',
    'whatsapp',
    'wa',
    'no wa',
    'no. wa'
  ];
  const isPrivacyKey = (k) => {
    const s = String(k || '').trim().toLowerCase();
    return PRIVACY_KEYS.some((key) => s === key || s.includes(key));
  };
  const scrubRecord = (rec) => {
    const out = { ...rec };
    for (const k of Object.keys(out)) if (isPrivacyKey(k)) out[k] = '';
    return out;
  };

  const normalizeStatus = (raw) => {
    const s = String(raw || '').trim().toLowerCase();
    if (['success', 'selesai', 'berhasil', 'done'].includes(s)) return 'success';
    if (['progress', 'proses', 'diproses', 'processing'].includes(s))
      return 'progress';
    if (['failed', 'gagal', 'dibatalkan', 'cancel', 'error'].includes(s))
      return 'failed';
    return 'pending';
  };

  const poFilterData = () => {
    const q = poSearch.value.trim().toLowerCase();
    const status = poStatus.value;
    return poState.allData.filter((item) => {
      const name = (item['Nickname'] || '').toLowerCase();
      const idServer = (item['ID Server'] || '').toLowerCase();
      const product = (item['Produk / Item'] || item['Item'] || '').toLowerCase();
      const match = name.includes(q) || idServer.includes(q) || product.includes(q);
      const s = normalizeStatus(item['Status']);
      return match && (status === 'all' || s === status);
    });
  };

  const poUpdatePagination = (cur, total) => {
    poPrev.disabled = cur <= 1;
    poNext.disabled = cur >= total;
  };

  const poRender = () => {
    const filtered = poFilterData();
    const totalItems = poState.allData.length;
    poTotal.textContent = `${totalItems} total pesanan${
      filtered.length !== totalItems ? `, ${filtered.length} ditemukan` : ''
    }`;

    const totalPages = Math.max(1, Math.ceil(filtered.length / poState.perPage));
    poState.currentPage = Math.min(Math.max(1, poState.currentPage), totalPages);
    const start = (poState.currentPage - 1) * poState.perPage;
    const pageData = filtered.slice(start, start + poState.perPage);

    poList.innerHTML = '';
    if (pageData.length === 0) {
      poList.innerHTML = `<div class="empty">Tidak ada hasil.</div>`;
      poUpdatePagination(0, 0);
      return;
    }

    const frag = document.createDocumentFragment();
    pageData.forEach((item) => {
      const clean = scrubRecord(item);
      const statusClass = normalizeStatus(clean['Status']);
      const name = clean['Nickname'] || clean['ID Server'] || 'Tanpa Nama';
      const product = clean['Produk / Item'] || clean['Item'] || 'N/A';

      const HIDE = new Set([
        'Nickname',
        'ID Server',
        'Produk / Item',
        'Item',
        'Status',
        ...Object.keys(clean).filter(isPrivacyKey)
      ]);

      const detailsHtml = Object.entries(clean)
        .filter(([k, v]) => v && !HIDE.has(k))
        .map(
          ([k, v]) => `
          <div class="detail-item">
            <div class="detail-label">${k}</div>
            <div class="detail-value">${v}</div>
          </div>`
        )
        .join('');

      const card = document.createElement('article');
      card.className = `card ${detailsHtml ? 'clickable' : ''}`;
      card.innerHTML = `
        <div class="card-header">
          <div>
            <div class="card-name">${name}</div>
            <div class="card-product">${product}</div>
          </div>
          <div class="status-badge ${statusClass}">${(clean['Status'] || 'Pending').toUpperCase()}</div>
        </div>
        ${detailsHtml ? `<div class="card-details"><div class="details-grid">${detailsHtml}</div></div>` : ''}
      `;
      if (detailsHtml) card.addEventListener('click', () => card.classList.toggle('expanded'));
      frag.appendChild(card);
    });
    poList.appendChild(frag);
    poUpdatePagination(poState.currentPage, totalPages);
  };

  const poSortByStatus = (data) => {
    const order = { progress: 1, pending: 2, success: 3, failed: 4 };
    return data.sort(
      (a, b) => order[normalizeStatus(a.Status)] - order[normalizeStatus(b.Status)]
    );
  };

  async function poFetch(sheetIndex0) {
    poTotal.textContent = 'Memuat data...';
    poList.innerHTML = `<div class="empty">Memuat pre‑order…</div>`;
    try {
      const res = await fetch(gvizCSV(sheetIndex0), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      // CSV → rows (split by comma bertahan untuk kolom ber‑quote)
      const rows = text
        .trim()
        .split('\n')
        .map((r) =>
          r
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map((c) => c.replace(/^"|"$/g, '').trim())
        );
      if (rows.length < 1) {
        poState.allData = [];
        return;
      }

      if (sheetIndex0 === 0) {
        // Sheet1: baris pertama = header
        const headers = rows.shift();
        const mapped = rows
          .map((row) =>
            Object.fromEntries(
              row.map((val, i) => [headers[i] || `col_${i + 1}`, val])
            )
          )
          .filter((item) => item[headers[0]]); // minimal kolom pertama ada
        poState.allData = poSortByStatus(mapped.map(scrubRecord));
      } else {
        // Sheet2: Skip baris pertama (mulai nomor 2)
        const body =
          rows[0]?.length === 3 &&
          ['id server', 'item', 'status'].includes(rows[0][0].toLowerCase())
            ? rows.slice(1)
            : rows;
        const mapped = body
          .slice(1) // <-- skip baris #1 (sesuai permintaan)
          .map((r) => ({
            'ID Server': r[0] || '',
            Item: r[1] || '',
            Status: r[2] || ''
          }))
          .filter((item) => item['ID Server']);
        poState.allData = poSortByStatus(mapped.map(scrubRecord));
      }
    } catch (e) {
      console.error('Pre‑order error:', e);
      poState.allData = [];
      poTotal.textContent = 'Gagal memuat data.';
    } finally {
      poState.currentPage = 1;
      poRender();
    }
  }

  function poInit() {
    const rebound = () => {
      poState.currentPage = 1;
      poRender();
    };
    poSearch?.addEventListener('input', rebound);
    poStatus?.addEventListener('change', rebound);
    poSheet?.addEventListener('change', (e) =>
      poFetch(parseInt(e.target.value, 10))
    );
    poPrev?.addEventListener('click', () => {
      if (poState.currentPage > 1) {
        poState.currentPage--;
        poRender();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    poNext?.addEventListener('click', () => {
      poState.currentPage++;
      poRender();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    poFetch(parseInt(poSheet.value, 10) || 0);
    poState.initialized = true;
  }

  // ===================== BOOT =====================
  document.addEventListener('DOMContentLoaded', () => {
    loadCatalog(); // Sheet3
    // mode awal katalog
    setMode('katalog');
  });

  // ===================== ANTI ZOOM (opsional) =====================
  window.addEventListener('gesturestart', function (e) {
    e.preventDefault();
  });
  window.addEventListener(
    'wheel',
    function (e) {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    },
    { passive: false }
  );
  window.addEventListener('keydown', function (e) {
    const isZoomKey = [
      'Equal',
      'NumpadAdd',
      'Minus',
      'NumpadSubtract',
      'Digit0',
      'Numpad0'
    ].includes(e.code);
    if ((e.ctrlKey || e.metaKey) && isZoomKey) e.preventDefault();
  });
  (function () {
    let last = 0;
    document.addEventListener(
      'touchend',
      function (e) {
        const now = Date.now();
        if (now - last <= 300) {
          e.preventDefault();
        }
        last = now;
      },
      { passive: false }
    );
  })();
})();
