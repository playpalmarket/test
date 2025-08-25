(function(){
  // ========= CONFIG =========
  const SHEET_ID='1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
  const SHEETS={katalog:{name:'Sheet3'},preorder:{name1:'Sheet1',name2:'Sheet2'}};
  const WA_NUMBER='6285877001999';
  const WA_GREETING='*Detail pesanan:*';
  let DATA=[],CATS=[],activeCat='',query='';

  const PAYMENT_OPTIONS = [
    { id: 'seabank', name: 'Seabank', feeType: 'fixed', value: 0 },
    { id: 'gopay', name: 'Gopay', feeType: 'fixed', value: 0 },
    { id: 'dana', name: 'Dana', feeType: 'fixed', value: 125 },
    { id: 'bank_to_dana', name: 'Bank ke Dana', feeType: 'fixed', value: 500 },
    { id: 'qris', name: 'Qris', feeType: 'percentage', value: 0.01 } // 1%
  ];
  let currentSelectedItem = null;

  // ========= ELEMENTS =========
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);
  
  const viewCatalog=$('#viewCatalog'), viewPreorder=$('#viewPreorder'), listEl=$('#list-container'), searchEl=$('#search'),
        countInfoEl=$('#countInfo'), errBox=$('#error'), itemTmpl=$('#itemTmpl'), skeletonItemTmpl=$('#skeletonItemTmpl'), 
        skeletonCardTmpl=$('#skeletonCardTmpl'), customSelectWrapper=$('#custom-select-wrapper'), customSelectBtn=$('#custom-select-btn'),
        customSelectValue=$('#custom-select-value'), customSelectOptions=$('#custom-select-options'),
        menuCat=$('#menuCat'), menuPO=$('#menuPO'), backdrop=$('#backdrop');

  // Payment Modal Elements
  const paymentModal = $('#paymentModal'), closeModalBtn = $('#closeModalBtn'), modalItemName = $('#modalItemName'),
        modalItemPrice = $('#modalItemPrice'), paymentOptionsContainer = $('#paymentOptions'), modalFee = $('#modalFee'),
        modalTotal = $('#modalTotal'), continueToWaBtn = $('#continueToWaBtn');

  // ========= MENU ITEMS =========
  const MENU_ITEMS = [
    { label:'Katalog', mode:'katalog' },
    { label:'Lacak Pre‑Order', mode:'preorder' },
    { divider:true },
    { label:'Donasi (Saweria)', href:'https://saweria.co/playpal' },
    { divider:true },
    { label:'Tutup', mode:'close' }
  ];

  // ========= DEBUG & VALIDATORS =========
  function toggleDebugGrid() { document.body.classList.toggle('debug-grid-enabled'); }
  function validateSpacing(containerSelector, expectedGap) {
    const items = $$(containerSelector);
    if (items.length < 2) return;
    for (let i = 0; i < items.length - 1; i++) {
      const itemA = items[i].getBoundingClientRect();
      const itemB = items[i+1].getBoundingClientRect();
      const actualGap = Math.round(itemB.left - itemA.right);
      if (actualGap !== expectedGap) {
        console.warn(`[Spacing Validator] Invalid gap found between item ${i} and ${i+1} in ${containerSelector}. Expected ${expectedGap}px, got ${actualGap}px.`);
      }
    }
    console.log(`[Spacing Validator] Validation complete for ${containerSelector}.`);
  }

  // ========= SCROLL ANIMATION =========
  function initScrollAnimations() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
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
      if (item.divider) { container.insertAdjacentHTML('beforeend', '<div class="menu-divider"></div>'); return; }
      const btn = document.createElement('button');
      btn.className = 'menu-btn';
      btn.textContent = item.label;
      if (item.href) { btn.addEventListener('click', () => window.open(item.href, '_blank', 'noopener'));
      } else if (item.mode === 'close') { btn.addEventListener('click', closeAllMenus);
      } else { btn.addEventListener('click', () => setMode(item.mode)); }
      container.appendChild(btn);
    });
  }

  function closeAllMenus(){ document.body.classList.remove('menu-is-open'); }
  function toggleMenu(){ document.body.classList.toggle('menu-is-open'); }

  function setMode(nextMode){
    const currentActive = $('.view-section.active');
    const nextView = $(nextMode === 'katalog' ? '#viewCatalog' : '#viewPreorder');
    if (currentActive === nextView) { closeAllMenus(); return; }
    
    currentActive.classList.remove('active');
    nextView.classList.add('active');

    closeAllMenus();
    if (nextMode === 'preorder' && !poState.initialized) poInit();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
  
  // ========= UTILS =========
  const prettyLabel=(raw)=>String(raw||'').trim().replace(/\s+/g,' ');
  const toIDR=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v);
  const sheetUrlJSON=(sheetName)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  const sheetUrlCSV =(sheetName)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

  // ========= SKELETON LOADER =========
  function showSkeleton(container, template, count=6){container.innerHTML='';const frag=document.createDocumentFragment();for(let i=0;i<count;i++){frag.appendChild(template.content.cloneNode(true));}container.appendChild(frag);}

  // ========= KATALOG LOGIC =========
  function parseGVizPairs(txt){const m=txt.match(/\{.*\}/s);if(!m)throw new Error('Invalid GViz response.');const obj=JSON.parse(m[0]);const table=obj.table||{},rows=table.rows||[],cols=table.cols||[];const pairs=Array.from({length:Math.floor(cols.length/2)},(_,i)=>({iTitle:i*2,iPrice:i*2+1,label:cols[i*2]?.label||''})).filter(p=>p.label&&cols[p.iPrice]);const out=[];for(const r of rows){const c=r.c||[];for(const p of pairs){const title=String(c[p.iTitle]?.v||'').trim();const priceRaw=c[p.iPrice]?.v;const price=(priceRaw!=null&&priceRaw!=='')?Number(priceRaw):NaN;if(title&&!isNaN(price))out.push({catKey:p.label,catLabel:prettyLabel(p.label),title,price});}}return out;}
  function toggleCustomSelect(open){const isOpen=typeof open==='boolean'?open:!customSelectWrapper.classList.contains('open');customSelectWrapper.classList.toggle('open',isOpen);customSelectBtn.setAttribute('aria-expanded',isOpen);}
  function buildGameSelect(){const map=new Map();DATA.forEach(it=>{if(!map.has(it.catKey))map.set(it.catKey,it.catLabel);});CATS=[...map].map(([key,label])=>({key,label}));customSelectOptions.innerHTML='';CATS.forEach((c,idx)=>{const el=document.createElement('div');el.className='custom-select-option';el.textContent=c.label;el.dataset.value=c.key;el.setAttribute('role','option');if(idx===0)el.classList.add('selected');el.addEventListener('click',()=>{activeCat=c.key;customSelectValue.textContent=c.label;$('.custom-select-option.selected')?.classList.remove('selected');el.classList.add('selected');toggleCustomSelect(false);renderList();});customSelectOptions.appendChild(el);});if(CATS.length>0){activeCat=CATS[0].key;customSelectValue.textContent=CATS[0].label;}else{customSelectValue.textContent="Data tidak tersedia";}}
  
  function renderList() {
    const items = DATA.filter(x => x.catKey === activeCat && (query === '' || x.title.toLowerCase().includes(query) || String(x.price).includes(query)));
    listEl.innerHTML = '';
    if (items.length === 0) { listEl.innerHTML = `<div class="empty">Tidak ada hasil ditemukan.</div>`; countInfoEl.textContent = ''; return; }
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

  async function loadCatalog(){try{errBox.style.display='none';showSkeleton(listEl,skeletonItemTmpl,9);const res=await fetch(sheetUrlJSON(SHEETS.katalog.name),{cache:'no-store'});if(!res.ok)throw new Error(`Network error: ${res.statusText}`);const txt=await res.text();DATA=parseGVizPairs(txt);if(DATA.length===0)throw new Error('Data kosong atau format tidak sesuai.');buildGameSelect();renderList();}catch(err){console.error("Fetch Katalog failed:",err);listEl.innerHTML='';errBox.style.display='block';errBox.textContent=`Oops, terjadi kesalahan. Silakan coba lagi.`}}

  // ========= PAYMENT MODAL LOGIC =========
  function calculateFee(price, option) {
    if (option.feeType === 'fixed') return option.value;
    if (option.feeType === 'percentage') return Math.ceil(price * option.value);
    return 0;
  }
  function updatePriceDetails() {
    const selectedOptionId = $('input[name="payment"]:checked').value;
    const selectedOption = PAYMENT_OPTIONS.find(opt => opt.id === selectedOptionId);
    const price = currentSelectedItem.price, fee = calculateFee(price, selectedOption), total = price + fee;
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
      const isChecked = index === 0, fee = calculateFee(item.price, option);
      paymentOptionsContainer.insertAdjacentHTML('beforeend', `
        <div class="payment-option">
          <input type="radio" id="${option.id}" name="payment" value="${option.id}" ${isChecked ? 'checked' : ''}>
          <label for="${option.id}">${option.name} <span style="float: right;">+ ${toIDR(fee)}</span></label>
        </div>`);
    });
    paymentOptionsContainer.querySelectorAll('input[name="payment"]').forEach(input => input.addEventListener('change', updatePriceDetails));
    updatePriceDetails();
    paymentModal.style.display = 'flex';
    setTimeout(() => paymentModal.classList.add('visible'), 10);
  }
  function closePaymentModal() {
    paymentModal.classList.remove('visible');
    setTimeout(() => { paymentModal.style.display = 'none'; currentSelectedItem = null; }, 210);
  }

  // ========= PRE-ORDER LOGIC =========
  const poSearch=$('#poSearch'),poStatus=$('#poStatus'),poSheet=$('#poSheet'),poList=$('#poList'),poPrev=$('#poPrev'),poNext=$('#poNext'),poTotal=$('#poTotal');
  const poState={initialized:false,allData:[],currentPage:1,perPage:15,displayMode:'detailed'};
  const normalizeStatus=(raw)=>{const s=String(raw||'').trim().toLowerCase();if(['success','selesai','berhasil','done'].includes(s))return'success';if(['progress','proses','diproses','processing'].includes(s))return'progress';if(['failed','gagal','dibatalkan','cancel','error'].includes(s))return'failed';return'pending';};
  const poFilterData=()=>{const q=poSearch.value.trim().toLowerCase(),statusFilter=poStatus.value;return poState.allData.filter(item=>{if(poState.displayMode==='detailed'){const[,, ,product,,nickname,,idGift]=item;const match=(product||'').toLowerCase().includes(q)||(nickname||'').toLowerCase().includes(q)||(idGift||'').toLowerCase().includes(q);const status=normalizeStatus(item[6]);return match&&(statusFilter==='all'||status===statusFilter);}else{const[orderNum,product]=item;const match=(orderNum||'').toLowerCase().includes(q)||(product||'').toLowerCase().includes(q);const status=normalizeStatus(item[2]);return match&&(statusFilter==='all'||status===statusFilter);}});};
  const poUpdatePagination=(cur,total)=>{poPrev.disabled=cur<=1;poNext.disabled=cur>=total;};
  const poRender=()=>{const filtered=poFilterData();const totalItems=poState.allData.length;poTotal.textContent=`${totalItems} total pesanan${filtered.length!==totalItems?`, ${filtered.length} ditemukan`:''}`;const totalPages=Math.max(1,Math.ceil(filtered.length/poState.perPage));poState.currentPage=Math.min(Math.max(1,poState.currentPage),totalPages);const start=(poState.currentPage-1)*poState.perPage;const pageData=filtered.slice(start,start+poState.perPage);poList.innerHTML='';if(pageData.length===0){poList.innerHTML=`<div class="empty">Tidak Ada Hasil Ditemukan</div>`;poUpdatePagination(0,0);return;}const frag=document.createDocumentFragment();pageData.forEach(item=>{const card=document.createElement('article');if(poState.displayMode==='detailed'){const[tglOrder,estPengiriman,,product,bulan,name,status]=item;const statusClass=normalizeStatus(status);const estDeliveryText=estPengiriman?`Estimasi Pengiriman: ${estPengiriman} 20:00 WIB`:'';const details=[{label:'TGL ORDER',value:tglOrder},{label:'BULAN',value:bulan}];const detailsHtml=details.filter(d=>d.value&&String(d.value).trim()!=='').map(d=>`<div class="detail-item"><div class="detail-label">${d.label}</div><div class="detail-value">${d.value}</div></div>`).join('');card.className=`card ${detailsHtml?'clickable':''}`;card.innerHTML=`<div class="card-header"><div><div class="card-name">${name||'Tanpa Nama'}</div><div class="card-product">${product||'N/A'}</div></div><div class="status-badge ${statusClass}">${(status||'Pending').toUpperCase()}</div></div>${estDeliveryText?`<div class="card-date">${estDeliveryText}</div>`:''}${detailsHtml?`<div class="card-details"><div class="details-grid">${detailsHtml}</div></div>`:''}`;if(detailsHtml)card.addEventListener('click',()=>card.classList.toggle('expanded'));}else{const[orderNum,product,status]=item;const statusClass=normalizeStatus(status);card.className='card';card.innerHTML=`<div class="card-header"><div><div class="card-name">${orderNum||'Tanpa Nomor'}</div><div class="card-product">${product||'N/A'}</div></div><div class="status-badge ${statusClass}">${(status||'Pending').toUpperCase()}</div></div>`;}frag.appendChild(card);});poList.appendChild(frag);poUpdatePagination(poState.currentPage,totalPages);};
  const poSortByStatus=(data,mode)=>{const order={'progress':1,'pending':2,'success':3,'failed':4};const statusIndex=(mode==='detailed')?6:2;return data.sort((a,b)=>order[normalizeStatus(a[statusIndex])]-order[normalizeStatus(b[statusIndex])]);};
  async function poFetch(sheetName){poTotal.textContent='Memuat data...';showSkeleton(poList,skeletonCardTmpl,5);poState.displayMode=(sheetName===SHEETS.preorder.name1)?'detailed':'simple';try{const res=await fetch(sheetUrlCSV(sheetName),{cache:'no-store'});if(!res.ok)throw new Error(`Network error: ${res.statusText}`);const text=await res.text();let rows=text.trim().split('\n').map(r=>r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,'').trim()));if(rows.length<2){poState.allData=[];return;}rows.shift();const dataRows=rows.filter(row=>row&&(row[0]||'').trim()!=='');poState.allData=poSortByStatus(dataRows,poState.displayMode);}catch(e){poState.allData=[];poTotal.textContent='Gagal memuat data.';console.error('Fetch Pre-Order failed:',e);}finally{poState.currentPage=1;poRender();}}
  function poInit(){const rebound=()=>{poState.currentPage=1;poRender();};poSearch.addEventListener('input',rebound);poStatus.addEventListener('change',rebound);poSheet.addEventListener('change',e=>{const selectedValue=e.target.value;const sheetToFetch=selectedValue==='0'?SHEETS.preorder.name1:SHEETS.preorder.name2;poFetch(sheetToFetch);});$('#poPrev').addEventListener('click',()=>{if(poState.currentPage>1){poState.currentPage--;poRender();window.scrollTo({top:0,behavior:'smooth'});}});$('#poNext').addEventListener('click',()=>{poState.currentPage++;poRender();window.scrollTo({top:0,behavior:'smooth'});});const initialSheet=poSheet.value==='0'?SHEETS.preorder.name1:SHEETS.preorder.name2;poFetch(initialSheet);poState.initialized=true;}

  // ========= INITIALIZATION =========
  function init() {
    // Event Listeners
    $$('.burger').forEach(b=>b.addEventListener('click',toggleMenu));
    $$('.theme-toggle').forEach(b=>b.addEventListener('click',toggleTheme));
    
    backdrop.addEventListener('click',closeAllMenus);
    document.addEventListener('click',(e)=>{ if(!customSelectWrapper.contains(e.target)) toggleCustomSelect(false); });
    customSelectBtn.addEventListener('click',()=>toggleCustomSelect());
    
    let debounceTimer;
    searchEl.addEventListener('input',e=>{ clearTimeout(debounceTimer); debounceTimer=setTimeout(()=>{ query=e.target.value.trim().toLowerCase(); renderList(); },210); });
    
    // Modal Listeners
    closeModalBtn.addEventListener('click', closePaymentModal);
    paymentModal.addEventListener('click', (e) => { if (e.target === paymentModal) closePaymentModal(); });

    // Debug Listeners
    document.addEventListener('keydown', (e) => {
      if (e.key === 'd' && e.ctrlKey) {
        e.preventDefault();
        toggleDebugGrid();
      }
      if (e.key === 'v' && e.ctrlKey) {
        e.preventDefault();
        validateSpacing('#list-container .list-item', 13);
        validateSpacing('#viewPreorder .card-grid .card', 21);
      }
    });

    // Initial calls
    renderMenu(menuCat);
    renderMenu(menuPO);
    initTheme();
    loadCatalog();
    initScrollAnimations();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
