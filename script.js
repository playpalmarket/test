(function(){
  // ========= KONFIGURASI =========
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
    { id: 'qris', name: 'Qris', feeType: 'percentage', value: 0.01 }
  ];
  let currentSelectedItem = null;

  // ========= ELEMEN DOM =========
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
  const paymentModal = document.getElementById('paymentModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalItemName = document.getElementById('modalItemName');
  const modalItemPrice = document.getElementById('modalItemPrice');
  const paymentOptionsContainer = document.getElementById('paymentOptions');
  const modalFee = document.getElementById('modalFee');
  const modalTotal = document.getElementById('modalTotal');
  const continueToWaBtn = document.getElementById('continueToWaBtn');
  const poSearch=document.getElementById('poSearch');
  const poStatus=document.getElementById('poStatus');
  const poSheet=document.getElementById('poSheet');
  const poList=document.getElementById('poList');
  const poPrev=document.getElementById('poPrev');
  const poNext=document.getElementById('poNext');
  const poTotal=document.getElementById('poTotal');
  
  // ========= NAVIGASI & PERPINDAHAN TAMPILAN =========
  function setMode(nextMode) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById(nextMode === 'katalog' ? 'viewCatalog' : 'viewPreorder').classList.add('active');
    
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => item.classList.remove('active'));
    const activeNavItem = document.querySelector(`.sidebar-nav .nav-item[data-mode="${nextMode}"]`);
    if(activeNavItem) activeNavItem.classList.add('active');

    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = activeNavItem ? activeNavItem.textContent.trim() : 'Dashboard';
    }
    
    document.getElementById('sidebar')?.classList.remove('open');
    document.body.classList.remove('menu-open');

    if (nextMode === 'preorder' && !poState.initialized) poInit();
  }
  
  // ========= FUNGSI UTILITAS =========
  const toIDR=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v);
  const sheetUrlJSON=(sheetName)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  const sheetUrlCSV =(sheetName)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  function showSkeleton(container, template, count=6){container.innerHTML='';const frag=document.createDocumentFragment();for(let i=0;i<count;i++){frag.appendChild(template.content.cloneNode(true));}container.appendChild(frag);}

  // ========= LOGIKA KATALOG =========
  function parseGVizPairs(txt){const m=txt.match(/\{.*\}/s);if(!m)throw new Error('Invalid GViz response.');const obj=JSON.parse(m[0]);const table=obj.table||{},rows=table.rows||[],cols=table.cols||[];const pairs=Array.from({length:Math.floor(cols.length/2)},(_,i)=>({iTitle:i*2,iPrice:i*2+1,label:cols[i*2]?.label||''})).filter(p=>p.label&&cols[p.iPrice]);const out=[];for(const r of rows){const c=r.c||[];for(const p of pairs){const title=String(c[p.iTitle]?.v||'').trim();const priceRaw=c[p.iPrice]?.v;const price=(priceRaw!=null&&priceRaw!=='')?Number(priceRaw):NaN;if(title&&!isNaN(price))out.push({catKey:p.label,catLabel:p.label.trim().replace(/\s+/g,' '),title,price});}}return out;}
  function toggleCustomSelect(open){const isOpen=typeof open==='boolean'?open:!customSelectWrapper.classList.contains('open');customSelectWrapper.classList.toggle('open',isOpen);customSelectBtn.setAttribute('aria-expanded',isOpen);}
  function buildGameSelect(){const map=new Map();DATA.forEach(it=>{if(!map.has(it.catKey))map.set(it.catKey,it.catLabel);});CATS=[...map].map(([key,label])=>({key,label}));customSelectOptions.innerHTML='';CATS.forEach((c,idx)=>{const el=document.createElement('div');el.className='custom-select-option';el.textContent=c.label;el.dataset.value=c.key;if(idx===0)el.classList.add('selected');el.addEventListener('click',()=>{activeCat=c.key;customSelectValue.textContent=c.label;document.querySelector('.custom-select-option.selected')?.classList.remove('selected');el.classList.add('selected');toggleCustomSelect(false);renderList();});customSelectOptions.appendChild(el);});if(CATS.length>0){activeCat=CATS[0].key;customSelectValue.textContent=CATS[0].label;}else{customSelectValue.textContent="Data tidak tersedia";}}
  
  function renderList() {
    const items = DATA.filter(x => x.catKey === activeCat && (query === '' || x.title.toLowerCase().includes(query) || String(x.price).includes(query)));
    listEl.innerHTML = '';
    if (items.length === 0) { listEl.innerHTML = `<div class="empty">Tidak ada hasil ditemukan.</div>`; countInfoEl.textContent = ''; return; }
    const frag = document.createDocumentFragment();
    items.forEach(it => {
      const clone = itemTmpl.content.cloneNode(true);
      const btn = clone.querySelector('.list-item');
      btn.querySelector('.title').textContent = it.title;
      btn.querySelector('.price').textContent = toIDR(it.price);
      btn.addEventListener('click', () => openPaymentModal(it));
      frag.appendChild(clone);
    });
    listEl.appendChild(frag);
    countInfoEl.textContent = `${items.length} item ditemukan`;
  }

  async function loadCatalog(){try{errBox.style.display='none';showSkeleton(listEl,skeletonItemTmpl,9);const res=await fetch(sheetUrlJSON(SHEETS.katalog.name),{cache:'no-store'});if(!res.ok)throw new Error(`Network error`);const txt=await res.text();DATA=parseGVizPairs(txt);if(DATA.length===0)throw new Error('Data kosong.');buildGameSelect();renderList();}catch(err){console.error("Fetch Katalog failed:",err);listEl.innerHTML='';errBox.style.display='block';errBox.textContent=`Oops, terjadi kesalahan. Coba beberapa saat lagi.`}}

  // ========= LOGIKA MODAL PEMBAYARAN =========
  function calculateFee(price, option) { return option.feeType === 'fixed' ? option.value : Math.ceil(price * option.value); }
  function updatePriceDetails() {
    const selectedOption = PAYMENT_OPTIONS.find(opt => opt.id === document.querySelector('input[name="payment"]:checked').value);
    const price = currentSelectedItem.price; const fee = calculateFee(price, selectedOption); const total = price + fee;
    modalFee.textContent = toIDR(fee); modalTotal.textContent = toIDR(total); updateWaLink(selectedOption, fee, total);
  }
  function updateWaLink(option, fee, total) {
      const { catLabel, title, price } = currentSelectedItem;
      const text = `${WA_GREETING}\n› Tipe: Katalog\n› Game: ${catLabel}\n› Item: ${title}\n› Pembayaran: ${option.name}\n› Harga: ${toIDR(price)}\n› Fee: ${toIDR(fee)}\n› Total: ${toIDR(total)}`;
      continueToWaBtn.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  }
  function openPaymentModal(item) {
    currentSelectedItem = item; modalItemName.textContent = item.title; modalItemPrice.textContent = toIDR(item.price);
    paymentOptionsContainer.innerHTML = PAYMENT_OPTIONS.map((option, index) => {
      const fee = calculateFee(item.price, option);
      return `<div class="payment-option"><input type="radio" id="${option.id}" name="payment" value="${option.id}" ${index === 0 ? 'checked' : ''}><label for="${option.id}">${option.name} <span style="float: right;">+ ${toIDR(fee)}</span></label></div>`;
    }).join('');
    paymentOptionsContainer.querySelectorAll('input[name="payment"]').forEach(input => input.addEventListener('change', updatePriceDetails));
    updatePriceDetails();
    paymentModal.style.display = 'flex'; setTimeout(() => paymentModal.classList.add('visible'), 10);
  }
  function closePaymentModal() { paymentModal.classList.remove('visible'); setTimeout(() => { paymentModal.style.display = 'none'; currentSelectedItem = null; }, 200); }

  // ========= LOGIKA PRE-ORDER =========
  const poState={initialized:false,allData:[],currentPage:1,perPage:15,displayMode:'detailed'};const normalizeStatus=(raw)=>{const s=String(raw||'').trim().toLowerCase();if(['success','selesai','berhasil','done'].includes(s))return'success';if(['progress','proses','diproses','processing'].includes(s))return'progress';if(['failed','gagal','dibatalkan','cancel','error'].includes(s))return'failed';return'pending';};const poFilterData=()=>{const q=poSearch.value.trim().toLowerCase();const statusFilter=poStatus.value;return poState.allData.filter(item=>{const status=normalizeStatus(poState.displayMode==='detailed'?item[6]:item[2]);if(statusFilter!=='all'&&status!==statusFilter)return false;if(poState.displayMode==='detailed'){return(item[3]||'').toLowerCase().includes(q)||(item[5]||'').toLowerCase().includes(q)||(item[7]||'').toLowerCase().includes(q);}else{return(item[0]||'').toLowerCase().includes(q)||(item[1]||'').toLowerCase().includes(q);}});}
  const poUpdatePagination=(cur,total)=>{poPrev.disabled=cur<=1;poNext.disabled=cur>=total;};
  const poRender=()=>{const filtered=poFilterData();const totalItems=poState.allData.length;poTotal.textContent=`${totalItems} total pesanan${filtered.length!==totalItems?`, ${filtered.length} ditemukan`:''}`;const totalPages=Math.max(1,Math.ceil(filtered.length/poState.perPage));poState.currentPage=Math.min(Math.max(1,poState.currentPage),totalPages);const start=(poState.currentPage-1)*poState.perPage;const pageData=filtered.slice(start,start+poState.perPage);poList.innerHTML='';if(pageData.length===0){poList.innerHTML=`<div class="empty">Tidak Ada Hasil Ditemukan</div>`;poUpdatePagination(0,0);return;}
  const frag=document.createDocumentFragment();pageData.forEach(item=>{const card=document.createElement('article');card.className='list-item';if(poState.displayMode==='detailed'){const[tglOrder,estPengiriman,,product,bulan,name,status]=item;const statusClass=normalizeStatus(status);card.innerHTML=`<div class="card-header" style="width:100%; display:flex; justify-content:space-between; align-items:start;"><div style="flex-grow:1;"><div class="card-name">${name||'Tanpa Nama'}</div><div class="card-product">${product||'N/A'}</div></div><div class="status-badge ${statusClass}">${(status||'Pending')}</div></div>${estPengiriman?`<div class="card-date" style="width:100%; font-size:12px; color:var(--text-tertiary); margin-top:8px;">Estimasi: ${estPengiriman} 20:00 WIB</div>`:''}`;}else{const[orderNum,product,status]=item;const statusClass=normalizeStatus(status);card.innerHTML=`<div class="card-header" style="width:100%; display:flex; justify-content:space-between; align-items:start;"><div style="flex-grow:1;"><div class="card-name">${orderNum||'Tanpa Nomor'}</div><div class="card-product">${product||'N/A'}</div></div><div class="status-badge ${statusClass}">${(status||'Pending')}</div></div>`;}frag.appendChild(card);});poList.appendChild(frag);poUpdatePagination(poState.currentPage,totalPages);};
  const poSortByStatus=(data,mode)=>{const order={'progress':1,'pending':2,'success':3,'failed':4};const statusIndex=(mode==='detailed')?6:2;return data.sort((a,b)=>order[normalizeStatus(a[statusIndex])]-order[normalizeStatus(b[statusIndex])]);};
  async function poFetch(sheetName){poTotal.textContent='Memuat data...';showSkeleton(poList,skeletonCardTmpl,5);poState.displayMode=(sheetName===SHEETS.preorder.name1)?'detailed':'simple';try{const res=await fetch(sheetUrlCSV(sheetName),{cache:'no-store'});if(!res.ok)throw new Error(`Network error`);const text=await res.text();let rows=text.trim().split('\n').map(r=>r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,'').trim()));rows.shift();poState.allData=poSortByStatus(rows.filter(row=>row&&row[0]&&row[0].trim()!==''),poState.displayMode);}catch(e){poState.allData=[];poTotal.textContent='Gagal memuat data.';console.error('Fetch PO failed:',e);}finally{poState.currentPage=1;poRender();}}
  function poInit(){const rebound=()=>{poState.currentPage=1;poRender();};poSearch.addEventListener('input',rebound);poStatus.addEventListener('change',rebound);poSheet.addEventListener('change',e=>{poFetch(e.target.value==='0'?SHEETS.preorder.name1:SHEETS.preorder.name2);});const pageContent=document.querySelector('.page-content');poPrev.addEventListener('click',()=>{if(poState.currentPage>1){poState.currentPage--;poRender();pageContent.scrollTo({top:0,behavior:'smooth'});}});poNext.addEventListener('click',()=>{poState.currentPage++;poRender();pageContent.scrollTo({top:0,behavior:'smooth'});});poFetch(poSheet.value==='0'?SHEETS.preorder.name1:SHEETS.preorder.name2);poState.initialized=true;}

  // ========= INISIALISASI HALAMAN =========
  function init() {
    lucide.createIcons();
    
    // --- Logika Menu Mobile ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        document.body.classList.toggle('menu-open');
      });
    }
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
            document.body.classList.remove('menu-open');
        }
    });

    // --- Event Listeners Lainnya ---
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      if (item.dataset.mode) {
        item.addEventListener('click', (e) => { e.preventDefault(); setMode(item.dataset.mode); });
      }
    });
    customSelectBtn?.addEventListener('click',()=>toggleCustomSelect());
    document.addEventListener('click',(e)=>{ if(customSelectWrapper && !customSelectWrapper.contains(e.target)) toggleCustomSelect(false); });
    let debounceTimer;
    searchEl?.addEventListener('input',e=>{ clearTimeout(debounceTimer); debounceTimer=setTimeout(()=>{ query=e.target.value.trim().toLowerCase(); renderList(); },200); });
    closeModalBtn?.addEventListener('click', closePaymentModal);
    paymentModal?.addEventListener('click', (e) => { if (e.target === paymentModal) closePaymentModal(); });

    // --- Anti-Copy, Anti-Zoom & Gestur ---
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('copy', e => e.preventDefault());
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    let lastTouchEnd = 0;
    document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTouchEnd <= 300) e.preventDefault(); lastTouchEnd = now; }, false);

    loadCatalog();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
