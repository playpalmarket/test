(function(){
  // ========= CONFIG =========
  const SHEET_ID='1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
  const SHEETS={katalog:{name:'Sheet3'},preorder:{name1:'Sheet1',name2:'Sheet2'}};
  const WA_NUMBER='6285877001999';
  const WA_GREETING='*Detail pesanan:*';
  let DATA=[],CATS=[],activeCat='',query='';
  let prefersReducedMotion = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const PAYMENT_OPTIONS = [
    { id: 'seabank', name: 'Seabank', feeType: 'fixed', value: 0 },
    { id: 'gopay', name: 'Gopay', feeType: 'fixed', value: 0 },
    { id: 'dana', name: 'Dana', feeType: 'fixed', value: 125 },
    { id: 'bank_to_dana', name: 'Bank ke Dana', feeType: 'fixed', value: 500 },
    { id: 'qris', name: 'Qris', feeType: 'percentage', value: 0.01 } // 1%
  ];
  let currentSelectedItem = null;

  // ========= ELEMENTS =========
  const listEl=document.getElementById('list-container');
  const searchEl=document.getElementById('search');
  const countInfoEl=document.getElementById('countInfo');
  const errBox=document.getElementById('error');
  const itemTmpl=document.getElementById('itemTmpl');
  const skeletonItemTmpl=document.getElementById('skeletonItemTmpl');
  const skeletonCardTmpl=document.getElementById('skeletonCardTmpl');
  const customSelectWrapper=document.getElementById('custom-select-wrapper');
  const customSelectBtn=document.getElementById('custom-select-btn');
  const customSelectValue=document.getElementById('custom-select-value');
  const customSelectOptions=document.getElementById('custom-select-options');
  const burgerCat=document.getElementById('burgerCat');
  const burgerPO=document.getElementById('burgerPO');
  const menuCat=document.getElementById('menuCat');
  const menuPO=document.getElementById('menuPO');
  const themeToggleBtns = [document.getElementById('theme-toggle-btn'), document.getElementById('theme-toggle-btn-po')];
  
  const paymentModal = document.getElementById('paymentModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalItemName = document.getElementById('modalItemName');
  const modalItemPrice = document.getElementById('modalItemPrice');
  const paymentOptionsContainer = document.getElementById('paymentOptions');
  const modalFee = document.getElementById('modalFee');
  const modalTotal = document.getElementById('modalTotal');
  const continueToWaBtn = document.getElementById('continueToWaBtn');

  // ========= MENU ITEMS =========
  const MENU_ITEMS = [
    { label:'Katalog', mode:'katalog' },
    { label:'Lacak Pre‑Order', mode:'preorder' },
    { divider:true },
    { label:'Donasi (Saweria)', href:'https://saweria.co/playpal' },
    { divider:true },
    { label:'Tutup', mode:'close' }
  ];

  // ========= SCROLL BEHAVIOR =========
  function initScrollBehavior() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (prefersReducedMotion) return;
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
    
    // Sticky header background
    let headerHeight = document.querySelector('.site-header')?.offsetHeight || 89;
    window.addEventListener('scroll', () => {
      document.body.classList.toggle('scrolled-past-header', window.scrollY > headerHeight);
    }, { passive: true });
  }
  
  // ========= THEME MANAGER =========
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

  // ========= MENU & MODE SWITCHER =========
  function renderMenu(container) {
    container.innerHTML = '';
    MENU_ITEMS.forEach(item => {
      if (item.divider) { container.appendChild(document.createElement('div')).className = 'menu-divider'; return; }
      const btn = document.createElement('button');
      btn.className = 'menu-btn';
      btn.textContent = item.label;
      if (item.href) { btn.addEventListener('click', () => window.open(item.href, '_blank', 'noopener'));
      } else if (item.mode === 'close') { btn.addEventListener('click', closeAllMenus);
      } else { btn.addEventListener('click', () => setMode(item.mode)); }
      container.appendChild(btn);
    });
  }
  function closeAllMenus(){
    [burgerCat,burgerPO].forEach(b=>b?.classList.remove('active'));
    [menuCat,menuPO].forEach(m=>m?.classList.remove('open'));
  }
  function toggleMenu(which){
    const btn = which === 'cat' ? burgerCat : burgerPO;
    const menu = which === 'cat' ? menuCat : menuPO;
    const isOpen = menu.classList.contains('open');
    closeAllMenus();
    if (!isOpen) { btn?.classList.add('active'); menu?.classList.add('open'); }
  }
  function setMode(nextMode){
    const currentActive = document.querySelector('.view-section.active');
    const nextView = document.getElementById(nextMode === 'katalog' ? 'viewCatalog' : 'viewPreorder');
    if (currentActive === nextView) { closeAllMenus(); return; }
    
    currentActive.classList.remove('active');
    nextView.classList.add('active');
    closeAllMenus();
    if (nextMode === 'preorder' && !poState.initialized) poInit();
    if (!prefersReducedMotion) window.scrollTo({top: 0, behavior: 'smooth'}); else window.scrollTo(0,0);
  }
  
  // ========= UTILS =========
  const toIDR=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v);
  const sheetUrlJSON=(sheetName)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  const sheetUrlCSV =(sheetName)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  function showSkeleton(container, template, count=6){container.innerHTML='';const frag=document.createDocumentFragment();for(let i=0;i<count;i++){frag.appendChild(template.content.cloneNode(true));}container.appendChild(frag);}

  // ========= KATALOG LOGIC =========
  function parseGVizPairs(txt){try{const m=txt.match(/\{.*\}/s);if(!m)throw new Error('Invalid GViz response.');const obj=JSON.parse(m[0]);const table=obj.table||{},rows=table.rows||[],cols=table.cols||[];const pairs=Array.from({length:Math.floor(cols.length/2)},(_,i)=>({iTitle:i*2,iPrice:i*2+1,label:cols[i*2]?.label||''})).filter(p=>p.label&&cols[p.iPrice]);const out=[];for(const r of rows){const c=r.c||[];for(const p of pairs){const title=String(c[p.iTitle]?.v||'').trim();const priceRaw=c[p.iPrice]?.v;const price=(priceRaw!=null&&priceRaw!=='')?Number(priceRaw):NaN;if(title&&!isNaN(price))out.push({catKey:p.label,catLabel:p.label.trim().replace(/\s+/g,' '),title,price});}}return out;}catch(e){console.error(e);return[];}}
  function toggleCustomSelect(open){const isOpen=typeof open==='boolean'?open:!customSelectWrapper.classList.contains('open');customSelectWrapper.classList.toggle('open',isOpen);customSelectBtn.setAttribute('aria-expanded',isOpen);}
  function buildGameSelect(){const map=new Map();DATA.forEach(it=>{if(!map.has(it.catKey))map.set(it.catKey,it.catLabel);});CATS=[...map].map(([key,label])=>({key,label}));customSelectOptions.innerHTML='';CATS.forEach((c,idx)=>{const el=document.createElement('div');el.className='custom-select-option';el.textContent=c.label;el.dataset.value=c.key;el.setAttribute('role','option');if(idx===0)el.classList.add('selected');el.addEventListener('click',()=>{activeCat=c.key;customSelectValue.textContent=c.label;document.querySelector('.custom-select-option.selected')?.classList.remove('selected');el.classList.add('selected');toggleCustomSelect(false);renderList();});customSelectOptions.appendChild(el);});if(CATS.length>0){activeCat=CATS[0].key;customSelectValue.textContent=CATS[0].label;}else{customSelectValue.textContent="Data tidak tersedia";}}
  
  function renderList() {
    const items = DATA.filter(x => x.catKey === activeCat && (query === '' || x.title.toLowerCase().includes(query) || String(x.price).includes(query)));
    listEl.innerHTML = '';
    if (items.length === 0) {
      listEl.innerHTML = `<div class="empty">Tidak ada hasil ditemukan.</div>`;
      countInfoEl.textContent = '';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const it of items) {
      const clone = itemTmpl.content.cloneNode(true);
      const itemEl = clone.querySelector('.list-item');
      itemEl.querySelector('.title').textContent = it.title;
      itemEl.querySelector('.price').textContent = toIDR(it.price);
      itemEl.addEventListener('click', () => openPaymentModal(it));
      frag.appendChild(itemEl);
    }
    listEl.appendChild(frag);
    countInfoEl.textContent = `${items.length} item ditemukan`;
  }

  async function loadCatalog(){try{errBox.style.display='none';showSkeleton(listEl,skeletonItemTmpl,9);const res=await fetch(sheetUrlJSON(SHEETS.katalog.name),{cache:'no-store'});if(!res.ok)throw new Error(`Network response was not ok: ${res.statusText}`);const txt=await res.text();DATA=parseGVizPairs(txt);if(DATA.length===0)throw new Error('Data kosong atau format kolom tidak sesuai.');buildGameSelect();renderList();}catch(err){console.error("Fetch Katalog failed:",err);listEl.innerHTML='';errBox.style.display='block';errBox.textContent=`Oops, terjadi kesalahan. Silakan coba beberapa saat lagi.`}}

  // ========= PAYMENT MODAL LOGIC =========
  function calculateFee(price, option) {return option.feeType==='fixed'?option.value:Math.ceil(price*option.value);}
  function updatePriceDetails() {
    const selectedOption = PAYMENT_OPTIONS.find(opt => opt.id === document.querySelector('input[name="payment"]:checked').value);
    const fee = calculateFee(currentSelectedItem.price, selectedOption);
    const total = currentSelectedItem.price + fee;
    modalFee.textContent = toIDR(fee);
    modalTotal.textContent = toIDR(total);
    updateWaLink(selectedOption, fee, total);
  }
  function updateWaLink(option, fee, total) {
      const { catLabel, title, price } = currentSelectedItem;
      const text = `${WA_GREETING}\n› Tipe: Katalog\n› Game: ${catLabel}\n› Item: ${title}\n› Pembayaran: ${option.name}\n› Harga: ${toIDR(price)}\n› Fee: ${toIDR(fee)}\n› Total: ${toIDR(total)}`;
      continueToWaBtn.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  }
  function openPaymentModal(item) {
    currentSelectedItem = item;
    modalItemName.textContent = item.title;
    modalItemPrice.textContent = toIDR(item.price);
    paymentOptionsContainer.innerHTML = '';
    PAYMENT_OPTIONS.forEach((option, index) => {
      const fee = calculateFee(item.price, option);
      paymentOptionsContainer.insertAdjacentHTML('beforeend', `
        <div class="payment-option">
          <input type="radio" id="${option.id}" name="payment" value="${option.id}" ${index===0?'checked':''}>
          <label for="${option.id}">${option.name}<span style="float: right;">+ ${toIDR(fee)}</span></label>
        </div>`);
    });
    paymentOptionsContainer.querySelectorAll('input[name="payment"]').forEach(input => input.addEventListener('change', updatePriceDetails));
    updatePriceDetails();
    paymentModal.style.display = 'flex';
    setTimeout(() => paymentModal.classList.add('visible'), 10);
  }
  function closePaymentModal() {
    paymentModal.classList.remove('visible');
    setTimeout(() => { paymentModal.style.display = 'none'; currentSelectedItem = null; }, 340);
  }

  // ========= PRE-ORDER LOGIC =========
  const poSearch=document.getElementById('poSearch'),poStatus=document.getElementById('poStatus'),poSheet=document.getElementById('poSheet'),poList=document.getElementById('poList'),poPrev=document.getElementById('poPrev'),poNext=document.getElementById('poNext'),poTotal=document.getElementById('poTotal');
  const poState={initialized:false,allData:[],currentPage:1,perPage:15,displayMode:'detailed'};
  const normalizeStatus=s=>(s=String(s||'').trim().toLowerCase(),['success','selesai','berhasil','done'].includes(s)?'success':['progress','proses','diproses','processing'].includes(s)?'progress':['failed','gagal','dibatalkan','cancel','error'].includes(s)?'failed':'pending');
  const poFilterData=()=>{const q=poSearch.value.trim().toLowerCase(),f=poStatus.value;return poState.allData.filter(i=>poState.displayMode==='detailed'?((i[3]||'').toLowerCase().includes(q)||(i[5]||'').toLowerCase().includes(q)||(i[7]||'').toLowerCase().includes(q))&&(f==='all'||normalizeStatus(i[6])===f):((i[0]||'').toLowerCase().includes(q)||(i[1]||'').toLowerCase().includes(q))&&(f==='all'||normalizeStatus(i[2])===f));};
  const poUpdatePagination=(cur,total)=>{poPrev.disabled=cur<=1;poNext.disabled=cur>=total;};
  const poRender=()=>{const filtered=poFilterData(),totalItems=poState.allData.length;poTotal.textContent=`${totalItems} total pesanan${filtered.length!==totalItems?`, ${filtered.length} ditemukan`:''}`;const totalPages=Math.max(1,Math.ceil(filtered.length/poState.perPage));poState.currentPage=Math.min(Math.max(1,poState.currentPage),totalPages);const pageData=filtered.slice((poState.currentPage-1)*poState.perPage,poState.currentPage*poState.perPage);poList.innerHTML='';if(pageData.length===0){poList.innerHTML=`<div class="empty">Tidak Ada Hasil Ditemukan</div>`;poUpdatePagination(0,0);return;}const frag=document.createDocumentFragment();pageData.forEach(item=>{const card=document.createElement('article');if(poState.displayMode==='detailed'){const[tglOrder,estPengiriman,,product,bulan,name,status]=item;const statusClass=normalizeStatus(status);card.className='card';card.innerHTML=`<div class="card-header"><div><div class="card-name">${name||'Tanpa Nama'}</div><div class="card-product">${product||'N/A'}</div></div><div class="status-badge ${statusClass}">${status||'Pending'}</div></div>${estPengiriman?`<div class="card-date">Estimasi Pengiriman: ${estPengiriman} 20:00 WIB</div>`:''}`;}else{const[orderNum,product,status]=item;const statusClass=normalizeStatus(status);card.className='card';card.innerHTML=`<div class="card-header"><div><div class="card-name">${orderNum||'Tanpa Nomor'}</div><div class="card-product">${product||'N/A'}</div></div><div class="status-badge ${statusClass}">${status||'Pending'}</div></div>`;}frag.appendChild(card);});poList.appendChild(frag);poUpdatePagination(poState.currentPage,totalPages);};
  const poSortByStatus=(data,mode)=>{const order={'progress':1,'pending':2,'success':3,'failed':4},idx=mode==='detailed'?6:2;return data.sort((a,b)=>order[normalizeStatus(a[idx])]-order[normalizeStatus(b[idx])]);};
  async function poFetch(sheetName){poTotal.textContent='Memuat data...';showSkeleton(poList,skeletonCardTmpl,5);poState.displayMode=sheetName===SHEETS.preorder.name1?'detailed':'simple';try{const res=await fetch(sheetUrlCSV(sheetName),{cache:'no-store'});if(!res.ok)throw new Error(`Network response was not ok: ${res.statusText}`);const text=await res.text();let rows=text.trim().split('\n').map(r=>r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,'').trim()));if(rows.length<2){poState.allData=[];return;}rows.shift();poState.allData=poSortByStatus(rows.filter(row=>row&&(row[0]||'').trim()!==''),poState.displayMode);}catch(e){poState.allData=[];poTotal.textContent='Gagal memuat data.';console.error('Fetch Pre-Order failed:',e);}finally{poState.currentPage=1;poRender();}}
  function poInit(){const rebound=()=>{poState.currentPage=1;poRender();};poSearch.addEventListener('input',rebound);poStatus.addEventListener('change',rebound);poSheet.addEventListener('change',e=>poFetch(e.target.value==='0'?SHEETS.preorder.name1:SHEETS.preorder.name2));poPrev.addEventListener('click',()=>{if(poState.currentPage>1){poState.currentPage--;poRender();if(!prefersReducedMotion)window.scrollTo({top:0,behavior:'smooth'});else window.scrollTo(0,0);}});poNext.addEventListener('click',()=>{poState.currentPage++;poRender();if(!prefersReducedMotion)window.scrollTo({top:0,behavior:'smooth'});else window.scrollTo(0,0);});poFetch(poSheet.value==='0'?SHEETS.preorder.name1:SHEETS.preorder.name2);poState.initialized=true;}

  // ========= DEBUG & VALIDATION =========
  const debugGrid = document.getElementById('debug-grid-overlay');
  function toggleDebugGrid() { debugGrid.classList.toggle('active'); }
  function validateSpacing(containerSelector, itemSelector, gapVarName) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const items = container.querySelectorAll(itemSelector);
    if (items.length < 2) return;
    const expectedGap = parseFloat(getComputedStyle(container).getPropertyValue(gapVarName));
    for (let i = 1; i < items.length; i++) {
        const prevRect = items[i-1].getBoundingClientRect();
        const currRect = items[i].getBoundingClientRect();
        const isVertical = Math.abs(currRect.top - prevRect.top) > Math.abs(currRect.left - prevRect.left);
        const actualGap = isVertical ? currRect.top - prevRect.bottom : currRect.left - prevRect.right;
        if (Math.round(actualGap) !== Math.round(expectedGap)) {
            console.warn(`VALIDATION FAILED in ${containerSelector}: Gap between item ${i-1} and ${i} is ${actualGap.toFixed(2)}px, expected ${expectedGap}px.`);
        }
    }
    console.log(`Validation complete for ${containerSelector}.`);
  }
  function runAllValidations() {
    validateSpacing('.list-container', '.list-item', 'gap');
    validateSpacing('.card-grid', '.card', 'gap');
    console.log("All validations finished.");
  }

  // ========= INITIALIZATION =========
  function init() {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Anti-Zoom
    document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => { const now = Date.now(); if (now - lastTouchEnd <= 300) e.preventDefault(); lastTouchEnd = now; }, false);

    // Event Listeners
    burgerCat?.addEventListener('click',()=>toggleMenu('cat'));
    burgerPO?.addEventListener('click',()=>toggleMenu('po'));
    themeToggleBtns.forEach(btn => btn?.addEventListener('click', toggleTheme));
    
    document.addEventListener('click',(e)=>{ const isOutsideMenu = !(menuCat?.contains(e.target) || burgerCat?.contains(e.target) || menuPO?.contains(e.target) || burgerPO?.contains(e.target)); if(isOutsideMenu) closeAllMenus(); });
    customSelectBtn.addEventListener('click',()=>toggleCustomSelect());
    document.addEventListener('click',(e)=>{ if(!customSelectWrapper.contains(e.target)) toggleCustomSelect(false);});

    let debounceTimer;
    searchEl.addEventListener('input',e=>{ clearTimeout(debounceTimer); debounceTimer=setTimeout(()=>{ query=e.target.value.trim().toLowerCase(); renderList(); }, 340); });
    
    // Modal Listeners
    closeModalBtn.addEventListener('click', closePaymentModal);
    paymentModal.addEventListener('click', (e) => { if (e.target === paymentModal) closePaymentModal(); });
    
    // Debug Listeners
    window.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'g') {
            e.preventDefault();
            toggleDebugGrid();
        }
        if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            runAllValidations();
        }
    });

    // Initial calls
    renderMenu(menuCat);
    renderMenu(menuPO);
    initTheme();
    loadCatalog();
    initScrollBehavior();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
