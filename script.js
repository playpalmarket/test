(function() {
    // ========= CONFIG (dari kode asli Anda) =========
    const SHEET_ID = '1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
    const SHEETS = {
        katalog: { name: 'Sheet3' },
        preorder: { name1: 'Sheet1', name2: 'Sheet2' },
        accounts: { name: 'Sheet5' }
    };
    const WA_NUMBER = '6285877001999';
    const WA_GREETING = '*Detail pesanan:*';
    let DATA = [],
        CATS = [],
        activeCat = '',
        query = '';

    const PAYMENT_OPTIONS = [
        { id: 'seabank', name: 'Seabank', feeType: 'fixed', value: 0 },
        { id: 'gopay', name: 'Gopay', feeType: 'fixed', value: 0 },
        { id: 'dana', name: 'Dana', feeType: 'fixed', value: 125 },
        { id: 'bank_to_dana', name: 'Bank ke Dana', feeType: 'fixed', value: 500 },
        { id: 'qris', name: 'Qris', feeType: 'percentage', value: 0.01 }
    ];
    let currentSelectedItem = null;

    // ========= MENU ITEMS (dari menu.js lama Anda) =========
    const MENU_ITEMS = [
      { id: 'toKatalog',  label: 'Katalog',         type: 'route', value: 'katalog' },
      { id: 'toPreorder', label: 'Lacak Pre‑Order', type: 'route', value: 'preorder' },
      { id: 'toAccounts', label: 'Akun Game',       type: 'route', value: 'accounts' },
      { divider: true },
      { id: 'film',    label: 'Tonton Film (Gratis)',  type: 'route', value: 'film' },
      { id: 'donasi',  label: 'Donasi (Saweria)',      type: 'link',  href: 'https://saweria.co/playpal' },
      { id: 'ebook',   label: 'E‑book',                type: 'link', href: '#' },
      { id: 'assets',  label: 'Asset Editing',         type: 'link', href: '#' }
    ];

    // ========= ELEMENTS (Gabungan baru dan lama) =========
    // Elemen Baru untuk Desain Baru
    const body = document.body;
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebarNav = document.getElementById('sidebarNav');
    const appOverlay = document.getElementById('appOverlay');
    
    // Elemen Lama (Tetap digunakan)
    const viewCatalog = document.getElementById('viewCatalog');
    const viewPreorder = document.getElementById('viewPreorder');
    const viewAccounts = document.getElementById('viewAccounts');
    const viewFilm = document.getElementById('viewFilm'); // Tambahkan jika belum ada
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
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeToggleBtnPO = document.getElementById('theme-toggle-btn-po');
    const themeToggleBtnAcc = document.getElementById('theme-toggle-btn-acc');
    const paymentModal = document.getElementById('paymentModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalItemName = document.getElementById('modalItemName');
    const modalItemPrice = document.getElementById('modalItemPrice');
    const paymentOptionsContainer = document.getElementById('paymentOptions');
    const modalFee = document.getElementById('modalFee');
    const modalTotal = document.getElementById('modalTotal');
    const continueToWaBtn = document.getElementById('continueToWaBtn');
    const accountSelect = document.getElementById('accountSelect');
    const accountDisplay = document.getElementById('accountDisplay');
    const accountEmpty = document.getElementById('accountEmpty');
    const accountError = document.getElementById('accountError');
    const carouselTrack = document.getElementById('carouselTrack');
    const carouselPrev = document.getElementById('carouselPrev');
    const carouselNext = document.getElementById('carouselNext');
    const accountPrice = document.getElementById('accountPrice');
    const accountStatus = document.getElementById('accountStatus');
    const accountDescription = document.getElementById('accountDescription');
    const buyAccountBtn = document.getElementById('buyAccountBtn');
    const offerAccountBtn = document.getElementById('offerAccountBtn');


    // ========= LOGIKA BARU: SIDEBAR MENU & MODE SWITCHER =========
    const closeMenu = () => {
      body.classList.remove('sidebar-open');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    };

    const toggleMenu = () => {
      body.classList.toggle('sidebar-open');
      const isExpanded = body.classList.contains('sidebar-open');
      hamburgerBtn.setAttribute('aria-expanded', isExpanded);
    };

    function setMode(nextMode) {
      const allViews = document.querySelectorAll('.view-section');
      const currentActive = document.querySelector('.view-section.active');
      let nextView;

      if (nextMode === 'katalog') nextView = viewCatalog;
      else if (nextMode === 'preorder') nextView = viewPreorder;
      else if (nextMode === 'accounts') nextView = viewAccounts;
      else if (nextMode === 'film') nextView = viewFilm;
      else return;
      
      if (currentActive === nextView) {
          closeMenu();
          return;
      }
      
      allViews.forEach(view => view.classList.remove('active'));
      nextView.classList.add('active');
      
      // Jalankan fungsi inisialisasi jika view pertama kali dibuka
      if (nextMode === 'preorder' && !poState.initialized) poInit();
      if (nextMode === 'accounts' && !accState.initialized) accountsInit();

      // Update tombol aktif di menu
      document.querySelectorAll('.sidebar-nav .menu-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.mode === nextMode);
      });
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      closeMenu();
    }
    
    function renderNewMenu() {
        sidebarNav.innerHTML = '';
        MENU_ITEMS.forEach(item => {
            if (item.divider) {
                const d = document.createElement('div');
                d.className = 'menu-divider';
                sidebarNav.appendChild(d);
                return;
            }
            const btn = document.createElement('button');
            btn.className = 'menu-btn';
            btn.type = 'button';
            btn.textContent = item.label;
            
            if (item.type === 'route') {
                btn.dataset.mode = item.value;
                if (item.value === 'katalog') btn.classList.add('active'); // Set default active
                btn.addEventListener('click', () => setMode(item.value));
            } else if (item.type === 'link') {
                btn.addEventListener('click', () => {
                    window.open(item.href, '_blank', 'noopener');
                    closeMenu();
                });
            }
            sidebarNav.appendChild(btn);
        });
    }


    // ========= THEME MANAGER (dari kode asli) =========
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
    
    // ... Salin SEMUA sisa fungsi dari script.js lama Anda ke sini ...
    // Mulai dari 'UTILS' sampai akhir. Kode tersebut tidak perlu diubah.
    
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
        
        const buttonEl = document.createElement('button');
        buttonEl.className = 'list-item';
        buttonEl.type = 'button';
        buttonEl.innerHTML = itemEl.innerHTML;
        
        buttonEl.querySelector('.title').textContent = it.title;
        buttonEl.querySelector('.price').textContent = toIDR(it.price);
        
        buttonEl.addEventListener('click', () => openPaymentModal(it));
        
        frag.appendChild(buttonEl);
      }
      listEl.appendChild(frag);
      countInfoEl.textContent = `${items.length} item ditemukan`;
    }

    async function loadCatalog(){try{errBox.style.display='none';showSkeleton(listEl,skeletonItemTmpl,9);const res=await fetch(sheetUrlJSON(SHEETS.katalog.name),{cache:'no-store'});if(!res.ok)throw new Error(`Network response was not ok: ${res.statusText}`);const txt=await res.text();DATA=parseGVizPairs(txt);if(DATA.length===0)throw new Error('Data kosong atau format kolom tidak sesuai.');buildGameSelect();renderList();}catch(err){console.error("Fetch Katalog failed:",err);listEl.innerHTML='';errBox.style.display='block';errBox.textContent=`Oops, terjadi kesalahan. Silakan coba beberapa saat lagi.`}}

    // ========= PAYMENT MODAL LOGIC =========
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
      const selectedOption = PAYMENT_OPTIONS.find(opt => opt.id === selectedOptionId);
      const price = currentSelectedItem.price;
      
      const fee = calculateFee(price, selectedOption);
      const total = price + fee;
      
      modalFee.textContent = toIDR(fee);
      modalTotal.textContent = toIDR(total);
      
      updateWaLink(selectedOption, fee, total);
    }
    
    function updateWaLink(option, fee, total) {
        const { catLabel, title, price } = currentSelectedItem;
        const text = `${WA_GREETING}\n› Tipe: ${catLabel}\n› Item: ${title}\n› Pembayaran: ${option.name}\n› Harga: ${toIDR(price)}\n› Fee: ${toIDR(fee)}\n› Total: ${toIDR(total)}`;
        continueToWaBtn.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
    }

    function openPaymentModal(item) {
      currentSelectedItem = item;
      modalItemName.textContent = item.title;
      modalItemPrice.textContent = toIDR(item.price);
      
      paymentOptionsContainer.innerHTML = '';
      PAYMENT_OPTIONS.forEach((option, index) => {
        const isChecked = index === 0;
        const fee = calculateFee(item.price, option);
        const optionHtml = `
          <div class="payment-option">
            <input type="radio" id="${option.id}" name="payment" value="${option.id}" ${isChecked ? 'checked' : ''}>
            <label for="${option.id}">
              ${option.name} 
              <span style="float: right;">+ ${toIDR(fee)}</span>
            </label>
          </div>
        `;
        paymentOptionsContainer.insertAdjacentHTML('beforeend', optionHtml);
      });

      paymentOptionsContainer.querySelectorAll('input[name="payment"]').forEach(input => {
        input.addEventListener('change', updatePriceDetails);
      });
      
      updatePriceDetails();
      
      paymentModal.style.display = 'flex';
      setTimeout(() => paymentModal.classList.add('visible'), 10);
    }
    
    function closePaymentModal() {
      paymentModal.classList.remove('visible');
      setTimeout(() => {
        paymentModal.style.display = 'none';
        currentSelectedItem = null;
      }, 200);
    }

    // ========= PRE-ORDER LOGIC =========
    const poSearch=document.getElementById('poSearch');const poStatus=document.getElementById('poStatus');const poSheet=document.getElementById('poSheet');const poList=document.getElementById('poList');const poPrev=document.getElementById('poPrev');const poNext=document.getElementById('poNext');const poTotal=document.getElementById('poTotal');const poState={initialized:false,allData:[],currentPage:1,perPage:15,displayMode:'detailed'};const normalizeStatus=(raw)=>{const s=String(raw||'').trim().toLowerCase();if(['success','selesai','berhasil','done'].includes(s))return'success';if(['progress','proses','diproses','processing'].includes(s))return'progress';if(['failed','gagal','dibatalkan','cancel','error'].includes(s))return'failed';return'pending';};const poFilterData=()=>{const q=poSearch.value.trim().toLowerCase();const statusFilter=poStatus.value;return poState.allData.filter(item=>{if(poState.displayMode==='detailed'){const product=(item[3]||'').toLowerCase();const nickname=(item[5]||'').toLowerCase();const idGift=(item[7]||'').toLowerCase();const match=product.includes(q)||nickname.includes(q)||idGift.includes(q);const status=normalizeStatus(item[6]);return match&&(statusFilter==='all'||status===statusFilter);}else{const orderNum=(item[0]||'').toLowerCase();const product=(item[1]||'').toLowerCase();const match=orderNum.includes(q)||product.includes(q);const status=normalizeStatus(item[2]);return match&&(statusFilter==='all'||status===statusFilter);}});};const poUpdatePagination=(cur,total)=>{poPrev.disabled=cur<=1;poNext.disabled=cur>=total;};const poRender=()=>{const filtered=poFilterData();const totalItems=poState.allData.length;poTotal.textContent=`${totalItems} total pesanan${filtered.length!==totalItems?`, ${filtered.length} ditemukan`:''}`;const totalPages=Math.max(1,Math.ceil(filtered.length/poState.perPage));poState.currentPage=Math.min(Math.max(1,poState.currentPage),totalPages);const start=(poState.currentPage-1)*poState.perPage;const pageData=filtered.slice(start,start+poState.perPage);poList.innerHTML='';if(pageData.length===0){poList.innerHTML=`<div class="empty">Tidak Ada Hasil Ditemukan</div>`;poUpdatePagination(0,0);return;}const frag=document.createDocumentFragment();pageData.forEach(item=>{const card=document.createElement('article');if(poState.displayMode==='detailed'){const tglOrder=item[0];const estPengiriman=item[1];const product=item[3];const bulan=item[4];const name=item[5];const status=item[6];const statusClass=normalizeStatus(status);const estDeliveryText=estPengiriman?`Estimasi Pengiriman: ${estPengiriman} 20:00 WIB`:'';const details=[{label:'TGL ORDER',value:tglOrder},{label:'BULAN',value:bulan}];const detailsHtml=details.filter(d=>d.value&&String(d.value).trim()!=='').map(d=>`<div class="detail-item"><div class="detail-label">${d.label}</div><div class="detail-value">${d.value}</div></div>`).join('');card.className=`card ${detailsHtml?'clickable':''}`;card.innerHTML=`<div class="card-header"><div><div class="card-name">${name||'Tanpa Nama'}</div><div class="card-product">${product||'N/A'}</div></div><div class="status-badge ${statusClass}">${(status||'Pending').toUpperCase()}</div></div>${estDeliveryText?`<div class="card-date">${estDeliveryText}</div>`:''}${detailsHtml?`<div class="card-details"><div class="details-grid">${detailsHtml}</div></div>`:''}`;if(detailsHtml)card.addEventListener('click',()=>card.classList.toggle('expanded'));}else{const orderNum=item[0];const product=item[1];const status=item[2];const statusClass=normalizeStatus(status);card.className='card';card.innerHTML=`<div class="card-header"><div><div class="card-name">${orderNum||'Tanpa Nomor'}</div><div class="card-product">${product||'N/A'}</div></div><div class="status-badge ${statusClass}">${(status||'Pending').toUpperCase()}</div></div>`;}frag.appendChild(card);});poList.appendChild(frag);poUpdatePagination(poState.currentPage,totalPages);};const poSortByStatus=(data,mode)=>{const order={'progress':1,'pending':2,'success':3,'failed':4};const statusIndex=(mode==='detailed')?6:2;return data.sort((a,b)=>order[normalizeStatus(a[statusIndex])]-order[normalizeStatus(b[statusIndex])]);};async function poFetch(sheetName){poTotal.textContent='Memuat data...';showSkeleton(poList,skeletonCardTmpl,5);poState.displayMode=(sheetName===SHEETS.preorder.name1)?'detailed':'simple';try{const res=await fetch(sheetUrlCSV(sheetName),{cache:'no-store'});if(!res.ok)throw new Error(`Network response was not ok: ${res.statusText}`);const text=await res.text();let rows=text.trim().split('\n').map(r=>r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,'').trim()));if(rows.length<2){poState.allData=[];return;}rows.shift();const dataRows=rows.filter(row=>row&&(row[0]||'').trim()!=='');poState.allData=poSortByStatus(dataRows,poState.displayMode);}catch(e){poState.allData=[];poTotal.textContent='Gagal memuat data.';console.error('Fetch Pre-Order failed:',e);}finally{poState.currentPage=1;poRender();}}
    function poInit(){const rebound=()=>{poState.currentPage=1;poRender();};poSearch.addEventListener('input',rebound);poStatus.addEventListener('change',rebound);poSheet.addEventListener('change',e=>{const selectedValue=e.target.value;const sheetToFetch=selectedValue==='0'?SHEETS.preorder.name1:SHEETS.preorder.name2;poFetch(sheetToFetch);});document.getElementById('poPrev').addEventListener('click',()=>{if(poState.currentPage>1){poState.currentPage--;poRender();window.scrollTo({top:0,behavior:'smooth'});}});document.getElementById('poNext').addEventListener('click',()=>{poState.currentPage++;poRender();window.scrollTo({top:0,behavior:'smooth'});});const initialSheet=poSheet.value==='0'?SHEETS.preorder.name1:SHEETS.preorder.name2;poFetch(initialSheet);poState.initialized=true;}

    // ========= AKUN GAME LOGIC =========
    const accState = { initialized: false, data: [], currentIndex: 0, currentAccount: null };
    function robustCsvParser(text) { const normalizedText = text.trim().replace(/\r\n/g, '\n'); const rows = []; let currentRow = []; let currentField = ''; let inQuotedField = false; for (let i = 0; i < normalizedText.length; i++) { const char = normalizedText[i]; if (inQuotedField) { if (char === '"') { if (i + 1 < normalizedText.length && normalizedText[i + 1] === '"') { currentField += '"'; i++; } else { inQuotedField = false; } } else { currentField += char; } } else { if (char === '"') { inQuotedField = true; } else if (char === ',') { currentRow.push(currentField); currentField = ''; } else if (char === '\n') { currentRow.push(currentField); rows.push(currentRow); currentRow = []; currentField = ''; } else { currentField += char; } } } currentRow.push(currentField); rows.push(currentRow); return rows; }
    async function parseAccountsSheet(text) { const rows = robustCsvParser(text); rows.shift(); const accounts = []; for (const row of rows) { if (!row || row.length < 5 || !row[0]) continue; const accountData = { title: row[0] || "Tanpa Judul", price: Number(row[1]) || 0, status: row[2] || "Tersedia", description: row[3] || "Tidak ada deskripsi.", images: (row[4] || "").split(',').map(url => url.trim()).filter(Boolean) }; accounts.push(accountData); } return accounts; }
    function populateAccountSelect() { accountSelect.innerHTML = '<option value="">Pilih Akun</option>'; if (accState.data.length === 0) { accountSelect.innerHTML = '<option value="">Tidak ada akun</option>'; accountEmpty.textContent = 'Tidak ada akun yang tersedia saat ini.'; accountEmpty.style.display = 'block'; return; } accState.data.forEach((acc, index) => { const option = document.createElement('option'); option.value = index; option.textContent = acc.title; accountSelect.appendChild(option); }); }
    function renderAccount(index) { const account = accState.data[index]; accState.currentAccount = account; if (!account) { accountDisplay.style.display = 'none'; accountEmpty.style.display = 'block'; return; } accountDisplay.classList.remove('expanded'); accountPrice.textContent = toIDR(account.price); accountDescription.textContent = account.description; accountStatus.textContent = account.status; accountStatus.className = 'account-status-badge'; accountStatus.classList.add(account.status.toLowerCase() === 'tersedia' ? 'available' : 'sold'); carouselTrack.innerHTML = ''; if (account.images && account.images.length > 0) { account.images.forEach(src => { const slide = document.createElement('div'); slide.className = 'carousel-slide'; const img = document.createElement('img'); img.src = src; img.alt = `Gambar untuk ${account.title}`; img.loading = 'lazy'; slide.appendChild(img); carouselTrack.appendChild(slide); }); } else { const slide = document.createElement('div'); slide.className = 'carousel-slide'; const placeholder = document.createElement('div'); placeholder.className = 'no-image-placeholder'; placeholder.style.cssText = "display:flex; align-items:center; justify-content:center; height:100%; aspect-ratio:16/9; background-color: var(--surface-secondary); color: var(--text-tertiary);"; placeholder.textContent = 'Gambar tidak tersedia'; slide.appendChild(placeholder); carouselTrack.appendChild(slide); } accState.currentIndex = 0; updateCarousel(); accountEmpty.style.display = 'none'; accountDisplay.style.display = 'block'; }
    function updateCarousel() { if (accountSelect.value === "") return; const account = accState.data[accountSelect.value]; if (!account) return; const totalSlides = account.images.length || 0; carouselTrack.style.transform = `translateX(-${accState.currentIndex * 100}%)`; carouselPrev.disabled = totalSlides <= 1; carouselNext.disabled = totalSlides <= 1 || accState.currentIndex >= totalSlides - 1; }
    function initCarousel() { carouselPrev.addEventListener('click', (e) => { e.stopPropagation(); if (accState.currentIndex > 0) { accState.currentIndex--; updateCarousel(); } }); carouselNext.addEventListener('click', (e) => { e.stopPropagation(); if (accountSelect.value === "") return; const totalSlides = accState.data[accountSelect.value].images.length; if (accState.currentIndex < totalSlides - 1) { accState.currentIndex++; updateCarousel(); } }); let touchStartX = 0; let touchEndX = 0; carouselTrack.addEventListener('touchstart', e => { e.stopPropagation(); touchStartX = e.changedTouches[0].screenX; }, { passive: true }); carouselTrack.addEventListener('touchend', e => { e.stopPropagation(); touchEndX = e.changedTouches[0].screenX; if (touchEndX < touchStartX - 50) carouselNext.click(); if (touchEndX > touchStartX + 50) carouselPrev.click(); }, { passive: true }); }
    async function accountsInit() { if(accState.initialized) return; accountError.style.display = 'none'; try { const res = await fetch(sheetUrlCSV(SHEETS.accounts.name), { cache: 'no-store' }); if (!res.ok) throw new Error(`Network response was not ok: ${res.statusText}`); const text = await res.text(); accState.data = await parseAccountsSheet(text); populateAccountSelect(); } catch (err) { console.error("Fetch Akun Game failed:", err); accountError.textContent = 'Gagal memuat data akun. Coba lagi nanti.'; accountError.style.display = 'block'; accountEmpty.style.display = 'none'; accountSelect.innerHTML = '<option value="">Gagal memuat</option>'; } accountSelect.addEventListener('change', e => { if (e.target.value !== "") { renderAccount(parseInt(e.target.value, 10)); } else { accountDisplay.style.display = 'none'; accountEmpty.style.display = 'block'; accState.currentAccount = null; } }); accountDisplay.addEventListener('click', (e) => { if(e.target.classList.contains('action-btn') || e.target.closest('.action-btn')) return; accountDisplay.classList.toggle('expanded'); }); buyAccountBtn.addEventListener('click', (e) => { e.stopPropagation(); if (accState.currentAccount) { openPaymentModal({ title: accState.currentAccount.title, price: accState.currentAccount.price, catLabel: 'Akun Game' }); } }); offerAccountBtn.addEventListener('click', (e) => { e.stopPropagation(); if (accState.currentAccount) { const text = `Halo, saya tertarik untuk menawar Akun Game: ${accState.currentAccount.title}`; window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener'); } }); initCarousel(); accState.initialized = true; }


    // ========= INITIALIZATION =========
    function init() {
        // Event Listeners Baru
        hamburgerBtn.addEventListener('click', toggleMenu);
        appOverlay.addEventListener('click', closeMenu);

        // Event Listeners Lama yang relevan
        themeToggleBtn?.addEventListener('click', toggleTheme);
        themeToggleBtnPO?.addEventListener('click', toggleTheme);
        themeToggleBtnAcc?.addEventListener('click', toggleTheme);
        
        customSelectBtn.addEventListener('click', () => toggleCustomSelect());
        document.addEventListener('click', (e) => {
            if (!customSelectWrapper.contains(e.target) && !customSelectBtn.contains(e.target)) toggleCustomSelect(false);
        });

        let debounceTimer;
        searchEl.addEventListener('input', e => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                query = e.target.value.trim().toLowerCase();
                renderList();
            }, 200);
        });

        closeModalBtn.addEventListener('click', closePaymentModal);
        paymentModal.addEventListener('click', (e) => {
            if (e.target === paymentModal) closePaymentModal();
        });

        // Initial calls
        renderNewMenu(); // Panggil fungsi menu baru
        initTheme();
        loadCatalog();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
