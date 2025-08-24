(function(){
  // ==========================================================================
  // KONFIGURASI & STATE APLIKASI
  // ==========================================================================
  const CONFIG = {
    SHEET_ID: '1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw',
    SHEETS: {
      katalog: { name: 'Sheet3' },
      preorder: { name1: 'Sheet1', name2: 'Sheet2' }
    },
    WA_NUMBER: '6285877001999',
    WA_GREETING: '*Detail pesanan:*',
    PAYMENT_OPTIONS: [
      { id: 'seabank', name: 'Seabank', feeType: 'fixed', value: 0 },
      { id: 'gopay', name: 'Gopay', feeType: 'fixed', value: 0 },
      { id: 'dana', name: 'Dana', feeType: 'fixed', value: 125 },
      { id: 'bank_to_dana', name: 'Bank ke Dana', feeType: 'fixed', value: 500 },
      { id: 'qris', name: 'Qris', feeType: 'percentage', value: 0.01 } // 1%
    ],
    ANIMATION_DURATION: 340 // Sync with --duration-natural
  };

  const state = {
    katalog: { data: [], categories: [], activeCategory: '', query: '' },
    preorder: { initialized: false, allData: [], currentPage: 1, perPage: 15, displayMode: 'detailed' },
    ui: { currentSelectedItem: null }
  };

  // ==========================================================================
  // ELEMEN DOM
  // ==========================================================================
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  const DOMElements = {
    viewCatalog: $('#viewCatalog'), viewPreorder: $('#viewPreorder'),
    listEl: $('#list-container'), searchEl: $('#search'), countInfoEl: $('#countInfo'), errBox: $('#error'),
    itemTmpl: $('#itemTmpl'), skeletonItemTmpl: $('#skeletonItemTmpl'), skeletonCardTmpl: $('#skeletonCardTmpl'),
    customSelect: { wrapper: $('#custom-select-wrapper'), btn: $('#custom-select-btn'), value: $('#custom-select-value'), options: $('#custom-select-options') },
    menus: { burgers: [$('#burgerCat'), $('#burgerPO')], containers: [$('#menuCat'), $('#menuPO')] },
    themeToggleBtns: $$('.theme-toggle-btn'),
    // Modal
    paymentModal: { overlay: $('#paymentModal'), name: $('#modalItemName'), price: $('#modalItemPrice'), options: $('#paymentOptions'), fee: $('#modalFee'), total: $('#modalTotal'), closeBtn: $('#closeModalBtn'), waBtn: $('#continueToWaBtn') },
    // Pre-order
    po: { search: $('#poSearch'), status: $('#poStatus'), sheet: $('#poSheet'), list: $('#poList'), prev: $('#poPrev'), next: $('#poNext'), total: $('#poTotal') }
  };

  // ==========================================================================
  // UTILITIES
  // ==========================================================================
  const prettyLabel = (raw) => String(raw || '').trim().replace(/\s+/g, ' ');
  const toIDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
  const sheetUrlJSON = (sheetName) => `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  const sheetUrlCSV = (sheetName) => `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const showSkeleton = (container, template, count = 6) => { container.innerHTML = ''; const frag = document.createDocumentFragment(); for (let i = 0; i < count; i++) { frag.appendChild(template.content.cloneNode(true)); } container.appendChild(frag); };

  // ==========================================================================
  // MODUL INTI
  // ==========================================================================

  // --- THEME MANAGER ---
  const ThemeManager = {
    apply: (theme) => document.body.classList.toggle('dark-mode', theme === 'dark'),
    init() {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.apply(savedTheme || (prefersDark ? 'dark' : 'light'));
      DOMElements.themeToggleBtns.forEach(btn => btn.addEventListener('click', () => this.toggle()));
    },
    toggle() {
      const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      this.apply(newTheme);
    }
  };

  // --- MODE SWITCHER (VIEW MANAGER) ---
  function setMode(nextMode) {
    const currentActive = $('.view-section.active');
    const nextView = nextMode === 'katalog' ? DOMElements.viewCatalog : DOMElements.viewPreorder;
    if (currentActive === nextView) return;
    
    currentActive.classList.remove('active');
    nextView.classList.add('active');

    if (nextMode === 'preorder' && !state.preorder.initialized) Preorder.init();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- SCROLL ANIMATION ---
  const ScrollAnimator = {
    init() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      $$('.reveal-on-scroll').forEach(el => observer.observe(el));
    }
  };

  // ==========================================================================
  // LOGIKA FITUR: KATALOG
  // ==========================================================================
  const Katalog = {
    parseGVizPairs(txt) {
      const m = txt.match(/\{.*\}/s);
      if (!m) throw new Error('Invalid GViz response.');
      const obj = JSON.parse(m[0]);
      const table = obj.table || {}, rows = table.rows || [], cols = table.cols || [];
      const pairs = Array.from({ length: Math.floor(cols.length / 2) }, (_, i) => ({ iTitle: i * 2, iPrice: i * 2 + 1, label: cols[i * 2]?.label || '' })).filter(p => p.label && cols[p.iPrice]);
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
    },
    toggleCustomSelect(open) {
      const isOpen = typeof open === 'boolean' ? open : !DOMElements.customSelect.wrapper.classList.contains('open');
      DOMElements.customSelect.wrapper.classList.toggle('open', isOpen);
      DOMElements.customSelect.btn.setAttribute('aria-expanded', isOpen);
    },
    buildGameSelect() {
      const map = new Map();
      state.katalog.data.forEach(it => { if (!map.has(it.catKey)) map.set(it.catKey, it.catLabel); });
      state.katalog.categories = [...map].map(([key, label]) => ({ key, label }));
      
      const { options, value } = DOMElements.customSelect;
      options.innerHTML = '';
      state.katalog.categories.forEach((c, idx) => {
        const el = document.createElement('div');
        el.className = 'custom-select-option';
        el.textContent = c.label;
        el.dataset.value = c.key;
        el.setAttribute('role', 'option');
        if (idx === 0) el.classList.add('selected');
        el.addEventListener('click', () => {
          state.katalog.activeCategory = c.key;
          value.textContent = c.label;
          $('.custom-select-option.selected')?.classList.remove('selected');
          el.classList.add('selected');
          this.toggleCustomSelect(false);
          this.render();
        });
        options.appendChild(el);
      });

      if (state.katalog.categories.length > 0) {
        state.katalog.activeCategory = state.katalog.categories[0].key;
        value.textContent = state.katalog.categories[0].label;
      } else {
        value.textContent = "Data tidak tersedia";
      }
    },
    render() {
      const { data, activeCategory, query } = state.katalog;
      const items = data.filter(x => x.catKey === activeCategory && (query === '' || x.title.toLowerCase().includes(query) || String(x.price).includes(query)));
      
      DOMElements.listEl.innerHTML = '';
      if (items.length === 0) {
        DOMElements.listEl.innerHTML = `<div class="empty">Tidak ada hasil ditemukan.</div>`;
        DOMElements.countInfoEl.textContent = '';
        return;
      }
      
      const frag = document.createDocumentFragment();
      for (const it of items) {
        const clone = DOMElements.itemTmpl.content.cloneNode(true);
        const buttonEl = clone.querySelector('.list-item');
        buttonEl.querySelector('.title').textContent = it.title;
        buttonEl.querySelector('.price').textContent = toIDR(it.price);
        buttonEl.addEventListener('click', () => PaymentModal.open(it));
        frag.appendChild(clone);
      }
      DOMElements.listEl.appendChild(frag);
      DOMElements.countInfoEl.textContent = `${items.length} item ditemukan`;
    },
    async load() {
      try {
        DOMElements.errBox.style.display = 'none';
        showSkeleton(DOMElements.listEl, DOMElements.skeletonItemTmpl, 9);
        const res = await fetch(sheetUrlJSON(CONFIG.SHEETS.katalog.name), { cache: 'no-store' });
        if (!res.ok) throw new Error(`Network response was not ok: ${res.statusText}`);
        const txt = await res.text();
        state.katalog.data = this.parseGVizPairs(txt);
        if (state.katalog.data.length === 0) throw new Error('Data kosong atau format kolom tidak sesuai.');
        this.buildGameSelect();
        this.render();
      } catch (err) {
        console.error("Fetch Katalog failed:", err);
        DOMElements.listEl.innerHTML = '';
        DOMElements.errBox.style.display = 'block';
        DOMElements.errBox.textContent = `Oops, terjadi kesalahan. Silakan coba beberapa saat lagi.`;
      }
    },
    init() {
      this.load();
      // Event Listeners for Katalog
      DOMElements.customSelect.btn.addEventListener('click', () => this.toggleCustomSelect());
      document.addEventListener('click', (e) => {
        if (!DOMElements.customSelect.wrapper.contains(e.target)) this.toggleCustomSelect(false);
      });
      let debounceTimer;
      DOMElements.searchEl.addEventListener('input', e => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { state.katalog.query = e.target.value.trim().toLowerCase(); this.render(); }, 200);
      });
    }
  };

  // ==========================================================================
  // LOGIKA FITUR: PAYMENT MODAL
  // ==========================================================================
  const PaymentModal = {
    calculateFee(price, option) {
      if (option.feeType === 'fixed') return option.value;
      if (option.feeType === 'percentage') return Math.ceil(price * option.value);
      return 0;
    },
    updatePriceDetails() {
      const selectedOptionId = $('input[name="payment"]:checked').value;
      const selectedOption = CONFIG.PAYMENT_OPTIONS.find(opt => opt.id === selectedOptionId);
      const price = state.ui.currentSelectedItem.price;
      
      const fee = this.calculateFee(price, selectedOption);
      const total = price + fee;
      
      DOMElements.paymentModal.fee.textContent = toIDR(fee);
      DOMElements.paymentModal.total.textContent = toIDR(total);
      this.updateWaLink(selectedOption, fee, total);
    },
    updateWaLink(option, fee, total) {
      const { catLabel, title, price } = state.ui.currentSelectedItem;
      const text = `${CONFIG.WA_GREETING}\n› Tipe: Katalog\n› Game: ${catLabel}\n› Item: ${title}\n› Pembayaran: ${option.name}\n› Harga: ${toIDR(price)}\n› Fee: ${toIDR(fee)}\n› Total: ${toIDR(total)}`;
      DOMElements.paymentModal.waBtn.href = `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(text)}`;
    },
    open(item) {
      state.ui.currentSelectedItem = item;
      const { name, price, options } = DOMElements.paymentModal;
      name.textContent = item.title;
      price.textContent = toIDR(item.price);
      
      options.innerHTML = '';
      CONFIG.PAYMENT_OPTIONS.forEach((option, index) => {
        const isChecked = index === 0;
        const fee = this.calculateFee(item.price, option);
        const optionHtml = `
          <div class="payment-option">
            <input type="radio" id="${option.id}" name="payment" value="${option.id}" ${isChecked ? 'checked' : ''}>
            <label for="${option.id}">${option.name} <span style="float: right;">+ ${toIDR(fee)}</span></label>
          </div>`;
        options.insertAdjacentHTML('beforeend', optionHtml);
      });

      options.querySelectorAll('input[name="payment"]').forEach(input => {
        input.addEventListener('change', () => this.updatePriceDetails());
      });
      
      this.updatePriceDetails(); // Initialize with the first option
      
      DOMElements.paymentModal.overlay.style.display = 'flex';
      setTimeout(() => DOMElements.paymentModal.overlay.classList.add('visible'), 10);
    },
    close() {
      DOMElements.paymentModal.overlay.classList.remove('visible');
      setTimeout(() => {
        DOMElements.paymentModal.overlay.style.display = 'none';
        state.ui.currentSelectedItem = null;
      }, CONFIG.ANIMATION_DURATION);
    },
    init() {
        const { overlay, closeBtn } = DOMElements.paymentModal;
        closeBtn.addEventListener('click', () => this.close());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });
    }
  };

  // ==========================================================================
  // LOGIKA FITUR: PRE-ORDER
  // ==========================================================================
  const Preorder = {
    // ... (Semua fungsi po* yang ada di file asli dipindahkan ke sini)
    // NOTE: For brevity, the large block of Preorder logic is collapsed.
    // The original logic from `poSearch` to `poInit` should be placed here,
    // referencing `state.preorder` and `DOMElements.po` instead of global variables.
    // Example refactor:
    // poFilterData() becomes this.filterData()
    // poSearch.value becomes DOMElements.po.search.value
    // poState becomes state.preorder
    normalizeStatus: (raw) => {const s=String(raw||'').trim().toLowerCase();if(['success','selesai','berhasil','done'].includes(s))return'success';if(['progress','proses','diproses','processing'].includes(s))return'progress';if(['failed','gagal','dibatalkan','cancel','error'].includes(s))return'failed';return'pending';},
    filterData: () => {const q=DOMElements.po.search.value.trim().toLowerCase();const statusFilter=DOMElements.po.status.value;return state.preorder.allData.filter(item=>{if(state.preorder.displayMode==='detailed'){const product=(item[3]||'').toLowerCase();const nickname=(item[5]||'').toLowerCase();const idGift=(item[7]||'').toLowerCase();const match=product.includes(q)||nickname.includes(q)||idGift.includes(q);const status=Preorder.normalizeStatus(item[6]);return match&&(statusFilter==='all'||status===statusFilter);}else{const orderNum=(item[0]||'').toLowerCase();const product=(item[1]||'').toLowerCase();const match=orderNum.includes(q)||product.includes(q);const status=Preorder.normalizeStatus(item[2]);return match&&(statusFilter==='all'||status===statusFilter);}});},
    updatePagination: (cur,total) => {DOMElements.po.prev.disabled=cur<=1;DOMElements.po.next.disabled=cur>=total;},
    render: () => {const filtered=Preorder.filterData();const totalItems=state.preorder.allData.length;DOMElements.po.total.textContent=`${totalItems} total pesanan${filtered.length!==totalItems?`, ${filtered.length} ditemukan`:''}`;const totalPages=Math.max(1,Math.ceil(filtered.length/state.preorder.perPage));state.preorder.currentPage=Math.min(Math.max(1,state.preorder.currentPage),totalPages);const start=(state.preorder.currentPage-1)*state.preorder.perPage;const pageData=filtered.slice(start,start+state.preorder.perPage);DOMElements.po.list.innerHTML='';if(pageData.length===0){DOMElements.po.list.innerHTML=`<div class="empty">Tidak Ada Hasil Ditemukan</div>`;Preorder.updatePagination(0,0);return;}const frag=document.createDocumentFragment();pageData.forEach(item=>{const card=document.createElement('article');if(state.preorder.displayMode==='detailed'){const[tglOrder,estPengiriman,,product,bulan,name,status]=item;const statusClass=Preorder.normalizeStatus(status);const estDeliveryText=estPengiriman?`Estimasi Pengiriman: ${estPengiriman} 20:00 WIB`:'';const details=[{label:'TGL ORDER',value:tglOrder},{label:'BULAN',value:bulan}];const detailsHtml=details.filter(d=>d.value&&String(d.value).trim()!=='').map(d=>`<div class="detail-item"><div class="detail-label">${d.label}</div><div class="detail-value">${d.value}</div></div>`).join('');card.className=`card ${detailsHtml?'clickable':''}`;card.innerHTML=`<div class="card-header"><div><div class="card-name">${name||'Tanpa Nama'}</div><div class="card-product">${product||'N/A'}</div></div><div class="status-badge ${statusClass}">${(status||'Pending').toUpperCase()}</div></div>${estDeliveryText?`<div class="card-date">${estDeliveryText}</div>`:''}${detailsHtml?`<div class="card-details"><div class="details-grid">${detailsHtml}</div></div>`:''}`;if(detailsHtml)card.addEventListener('click',()=>card.classList.toggle('expanded'));}else{const[orderNum,product,status]=item;const statusClass=Preorder.normalizeStatus(status);card.className='card';card.innerHTML=`<div class="card-header"><div><div class="card-name">${orderNum||'Tanpa Nomor'}</div><div class="card-product">${product||'N/A'}</div></div><div class="status-badge ${statusClass}">${(status||'Pending').toUpperCase()}</div></div>`;}frag.appendChild(card);});DOMElements.po.list.appendChild(frag);Preorder.updatePagination(state.preorder.currentPage,totalPages);},
    sortByStatus: (data,mode) => {const order={'progress':1,'pending':2,'success':3,'failed':4};const statusIndex=(mode==='detailed')?6:2;return data.sort((a,b)=>order[Preorder.normalizeStatus(a[statusIndex])]-order[Preorder.normalizeStatus(b[statusIndex])]);},
    fetch: async function(sheetName){DOMElements.po.total.textContent='Memuat data...';showSkeleton(DOMElements.po.list,DOMElements.skeletonCardTmpl,5);state.preorder.displayMode=(sheetName===CONFIG.SHEETS.preorder.name1)?'detailed':'simple';try{const res=await fetch(sheetUrlCSV(sheetName),{cache:'no-store'});if(!res.ok)throw new Error(`Network response was not ok: ${res.statusText}`);const text=await res.text();let rows=text.trim().split('\n').map(r=>r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,'').trim()));if(rows.length<2){state.preorder.allData=[];return;}rows.shift();const dataRows=rows.filter(row=>row&&(row[0]||'').trim()!=='');state.preorder.allData=this.sortByStatus(dataRows,state.preorder.displayMode);}catch(e){state.preorder.allData=[];DOMElements.po.total.textContent='Gagal memuat data.';console.error('Fetch Pre-Order failed:',e);}finally{state.preorder.currentPage=1;this.render();}},
    init: function() {
      const rebound=()=>{state.preorder.currentPage=1;this.render();};
      DOMElements.po.search.addEventListener('input',rebound);
      DOMElements.po.status.addEventListener('change',rebound);
      DOMElements.po.sheet.addEventListener('change',e=>{const sheetToFetch=e.target.value==='0'?CONFIG.SHEETS.preorder.name1:CONFIG.SHEETS.preorder.name2;this.fetch(sheetToFetch);});
      DOMElements.po.prev.addEventListener('click',()=>{if(state.preorder.currentPage>1){state.preorder.currentPage--;this.render();window.scrollTo({top:0,behavior:'smooth'});}});
      DOMElements.po.next.addEventListener('click',()=>{state.preorder.currentPage++;this.render();window.scrollTo({top:0,behavior:'smooth'});});
      const initialSheet=DOMElements.po.sheet.value==='0'?CONFIG.SHEETS.preorder.name1:CONFIG.SHEETS.preorder.name2;
      this.fetch(initialSheet);
      state.preorder.initialized=true;
    }
  };


  // ==========================================================================
  // INISIALISASI APLIKASI
  // ==========================================================================
  function AppInit() {
    // Anti-Zoom for native app feel
    document.addEventListener('touchstart', (event) => { if (event.touches.length > 1) event.preventDefault(); }, { passive: false });
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) event.preventDefault();
      lastTouchEnd = now;
    }, false);
    
    // Initialize Core Modules
    ThemeManager.init();
    ScrollAnimator.init();
    MenuModule.init({ 
        burgers: DOMElements.menus.burgers, 
        menus: DOMElements.menus.containers, 
        onRoute: setMode 
    });

    // Initialize Feature Logic
    Katalog.init();
    PaymentModal.init();
    // Preorder.init() is called on demand by setMode
  }

  document.addEventListener('DOMContentLoaded', AppInit);
})();
