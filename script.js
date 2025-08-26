// ============== SCRIPT.JS VERSI FINAL - TELITI & PROFESIONAL ==============
(function() {
    // ========= KONFIGURASI & VARIABEL STATE =========
    const SHEET_ID = '1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
    const SHEETS = {
        katalog: { name: 'Sheet3' },
        preorder: { name1: 'Sheet1', name2: 'Sheet2' },
        accounts: { name: 'Sheet5' }
    };
    const WA_NUMBER = '6285877001999';
    const WA_GREETING = '*Detail pesanan:*';
    
    let DATA = [], CATS = [], activeCat = '', query = '';
    const poState = { initialized: false, allData: [], currentPage: 1, perPage: 15, displayMode: 'detailed' };
    const accState = { initialized: false, data: [], currentIndex: 0, currentAccount: null };
    let currentSelectedItem = null;

    const PAYMENT_OPTIONS = [
        { id: 'seabank', name: 'Seabank', feeType: 'fixed', value: 0 },
        { id: 'gopay', name: 'Gopay', feeType: 'fixed', value: 0 },
        { id: 'dana', name: 'Dana', feeType: 'fixed', value: 125 },
        { id: 'bank_to_dana', name: 'Bank ke Dana', feeType: 'fixed', value: 500 },
        { id: 'qris', name: 'Qris', feeType: 'percentage', value: 0.01 }
    ];

    const MENU_ITEMS = [
      { id: 'toKatalog',  label: 'Katalog',         type: 'route', value: 'catalog' },
      { id: 'toPreorder', label: 'Lacak Pre‑Order', type: 'route', value: 'preorder' },
      { id: 'toAccounts', label: 'Akun Game',       type: 'route', value: 'accounts' },
      { divider: true },
      { id: 'film',    label: 'Tonton Film (Gratis)',  type: 'route', value: 'film' },
      { id: 'donasi',  label: 'Donasi (Saweria)',      type: 'link',  href: 'https://saweria.co/playpal' },
      { id: 'ebook',   label: 'E‑book',                type: 'link', href: '#' },
      { id: 'assets',  label: 'Asset Editing',         type: 'link', href: '#' }
    ];

    // ========= FUNGSI INTI APLIKASI (NAVIGASI, TEMA, DLL) =========
    function closeMenu() {
      document.body.classList.remove('sidebar-open');
      document.getElementById('hamburgerBtn')?.setAttribute('aria-expanded', 'false');
    }

    function toggleMenu() {
      document.body.classList.toggle('sidebar-open');
      const isExpanded = document.body.classList.contains('sidebar-open');
      document.getElementById('hamburgerBtn')?.setAttribute('aria-expanded', isExpanded);
    }

    function setMode(nextMode) {
      const allViews = document.querySelectorAll('.view-section');
      const nextView = document.getElementById(`view${nextMode.charAt(0).toUpperCase() + nextMode.slice(1)}`);

      if (!nextView) {
        console.error(`View untuk "${nextMode}" tidak ditemukan.`);
        return;
      }
      
      allViews.forEach(view => view.classList.remove('active'));
      nextView.classList.add('active');
      
      // Inisialisasi data saat view pertama kali diaktifkan
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
        const sidebarNav = document.getElementById('sidebarNav');
        if (!sidebarNav) return;
        
        sidebarNav.innerHTML = '';
        MENU_ITEMS.forEach(item => {
            if (item.divider) {
                sidebarNav.insertAdjacentHTML('beforeend', '<div class="menu-divider"></div>');
                return;
            }
            const btn = document.createElement('button');
            btn.className = 'menu-btn';
            btn.type = 'button';
            btn.textContent = item.label;
            
            if (item.type === 'route') {
                btn.dataset.mode = item.value;
                if (item.value === 'catalog') btn.classList.add('active');
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

    function applyTheme(theme) { document.body.classList.toggle('dark-mode', theme === 'dark'); }
    function initTheme() { const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); applyTheme(savedTheme); }
    function toggleTheme() { const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark'; localStorage.setItem('theme', newTheme); applyTheme(newTheme); }
    
    // ... (SEMUA FUNGSI LOGIKA BISNIS ANDA DARI KATALOG HINGGA AKUN GAME TETAP DI SINI) ...
    // Saya telah menyingkatnya agar tidak terlalu panjang, tapi pastikan semua fungsi lama Anda ada di sini.
    const toIDR = v => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
    const sheetUrlJSON = (sheetName) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
    const sheetUrlCSV = (sheetName) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    function showSkeleton(container, template, count = 6) { if(!container || !template) return; container.innerHTML = ''; const frag = document.createDocumentFragment(); for (let i = 0; i < count; i++) { frag.appendChild(template.content.cloneNode(true)); } container.appendChild(frag); }
    function parseGVizPairs(txt){const m=txt.match(/\{.*\}/s);if(!m)throw new Error('Invalid GViz response.');const obj=JSON.parse(m[0]);const table=obj.table||{},rows=table.rows||[],cols=table.cols||[];const pairs=Array.from({length:Math.floor(cols.length/2)},(_,i)=>({iTitle:i*2,iPrice:i*2+1,label:cols[i*2]?.label||''})).filter(p=>p.label&&cols[p.iPrice]);const out=[];for(const r of rows){const c=r.c||[];for(const p of pairs){const title=String(c[p.iTitle]?.v||'').trim();const priceRaw=c[p.iPrice]?.v;const price=(priceRaw!=null&&priceRaw!=='')?Number(priceRaw):NaN;if(title&&!isNaN(price))out.push({catKey:p.label,catLabel:String(p.label||'').trim().replace(/\s+/g,' '),title,price});}}return out;}
    function toggleCustomSelect(open){const customSelectWrapper=document.getElementById('custom-select-wrapper'); if(!customSelectWrapper)return; const isOpen=typeof open==='boolean'?open:!customSelectWrapper.classList.contains('open');customSelectWrapper.classList.toggle('open',isOpen);document.getElementById('custom-select-btn')?.setAttribute('aria-expanded',isOpen);}
    function buildGameSelect(){const map=new Map();DATA.forEach(it=>{if(!map.has(it.catKey))map.set(it.catKey,it.catLabel);});CATS=[...map].map(([key,label])=>({key,label}));const customSelectOptions=document.getElementById('custom-select-options'); const customSelectValue=document.getElementById('custom-select-value'); if(!customSelectOptions || !customSelectValue) return; customSelectOptions.innerHTML='';CATS.forEach((c,idx)=>{const el=document.createElement('div');el.className='custom-select-option';el.textContent=c.label;el.dataset.value=c.key;el.setAttribute('role','option');if(idx===0)el.classList.add('selected');el.addEventListener('click',()=>{activeCat=c.key;customSelectValue.textContent=c.label;document.querySelector('.custom-select-option.selected')?.classList.remove('selected');el.classList.add('selected');toggleCustomSelect(false);renderList();});customSelectOptions.appendChild(el);});if(CATS.length>0){activeCat=CATS[0].key;customSelectValue.textContent=CATS[0].label;}else{customSelectValue.textContent="Data tidak tersedia";}}
    function renderList(){const listEl=document.getElementById('list-container'); const countInfoEl=document.getElementById('countInfo'); const itemTmpl=document.getElementById('itemTmpl'); if(!listEl || !countInfoEl || !itemTmpl) return; const items=DATA.filter(x=>x.catKey===activeCat&&(query===''||x.title.toLowerCase().includes(query)||String(x.price).includes(query)));listEl.innerHTML='';if(items.length===0){listEl.innerHTML=`<div class="empty">Tidak ada hasil ditemukan.</div>`;countInfoEl.textContent='';return;}const frag=document.createDocumentFragment();for(const it of items){const clone=itemTmpl.content.cloneNode(true);const buttonEl=document.createElement('button');buttonEl.className='list-item';buttonEl.type='button';buttonEl.innerHTML=clone.querySelector('.list-item').innerHTML;buttonEl.querySelector('.title').textContent=it.title;buttonEl.querySelector('.price').textContent=toIDR(it.price);buttonEl.addEventListener('click',()=>openPaymentModal(it));frag.appendChild(buttonEl);}listEl.appendChild(frag);countInfoEl.textContent=`${items.length} item ditemukan`;}
    async function loadCatalog(){const listEl=document.getElementById('list-container'); const errBox=document.getElementById('error'); const skeletonItemTmpl=document.getElementById('skeletonItemTmpl'); if(!listEl || !errBox || !skeletonItemTmpl) return; try{errBox.style.display='none';showSkeleton(listEl,skeletonItemTmpl,9);const res=await fetch(sheetUrlJSON(SHEETS.katalog.name),{cache:'no-store'});if(!res.ok)throw new Error(`Network error`);const txt=await res.text();DATA=parseGVizPairs(txt);if(DATA.length===0)throw new Error('Data kosong');buildGameSelect();renderList();}catch(err){console.error("Fetch Katalog failed:",err);listEl.innerHTML='';errBox.style.display='block';errBox.textContent=`Oops, terjadi kesalahan.`}}
    function openPaymentModal(item){currentSelectedItem=item;const paymentModal=document.getElementById('paymentModal'); const paymentOptionsContainer=document.getElementById('paymentOptions'); if(!paymentModal || !paymentOptionsContainer) return; document.getElementById('modalItemName').textContent=item.title;document.getElementById('modalItemPrice').textContent=toIDR(item.price);paymentOptionsContainer.innerHTML='';PAYMENT_OPTIONS.forEach((option,index)=>{const fee=option.feeType==='fixed'?option.value:Math.ceil(item.price*option.value);const optionHtml=`<div class="payment-option"><input type="radio" id="${option.id}" name="payment" value="${option.id}" ${index===0?'checked':''}> <label for="${option.id}">${option.name} <span style="float: right;">+ ${toIDR(fee)}</span></label></div>`;paymentOptionsContainer.insertAdjacentHTML('beforeend',optionHtml);});paymentOptionsContainer.querySelectorAll('input[name="payment"]').forEach(input=>{input.addEventListener('change',updatePriceDetails);});updatePriceDetails();paymentModal.style.display='flex';setTimeout(()=>paymentModal.classList.add('visible'),10);}
    function closePaymentModal(){const paymentModal=document.getElementById('paymentModal'); if(!paymentModal) return; paymentModal.classList.remove('visible');setTimeout(()=>{paymentModal.style.display='none';currentSelectedItem=null;},200);}
    function updatePriceDetails(){const selectedOption=PAYMENT_OPTIONS.find(opt=>opt.id===document.querySelector('input[name="payment"]:checked').value);const price=currentSelectedItem.price;const fee=selectedOption.feeType==='fixed'?selectedOption.value:Math.ceil(price*selectedOption.value);const total=price+fee;document.getElementById('modalFee').textContent=toIDR(fee);document.getElementById('modalTotal').textContent=toIDR(total);const{catLabel,title}=currentSelectedItem;document.getElementById('continueToWaBtn').href=`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`${WA_GREETING}\n› Tipe: ${catLabel}\n› Item: ${title}\n› Pembayaran: ${selectedOption.name}\n› Harga: ${toIDR(price)}\n› Fee: ${toIDR(fee)}\n› Total: ${toIDR(total)}`)}`;}
    function poInit(){const poSearch=document.getElementById('poSearch');const poStatus=document.getElementById('poStatus');const poSheet=document.getElementById('poSheet'); if(!poSearch || !poStatus || !poSheet) return; const rebound=()=>{poState.currentPage=1;poRender();};poSearch.addEventListener('input',rebound);poStatus.addEventListener('change',rebound);poSheet.addEventListener('change',e=>{const sheetToFetch=e.target.value==='0'?SHEETS.preorder.name1:SHEETS.preorder.name2;poFetch(sheetToFetch);});document.getElementById('poPrev')?.addEventListener('click',()=>{if(poState.currentPage>1){poState.currentPage--;poRender();window.scrollTo({top:0,behavior:'smooth'});}});document.getElementById('poNext')?.addEventListener('click',()=>{poState.currentPage++;poRender();window.scrollTo({top:0,behavior:'smooth'});});const initialSheet=poSheet.value==='0'?SHEETS.preorder.name1:SHEETS.preorder.name2;poFetch(initialSheet);poState.initialized=true;}
    const normalizeStatus=(raw)=>{const s=String(raw||'').trim().toLowerCase();if(['success','selesai','berhasil','done'].includes(s))return'success';if(['progress','proses','diproses','processing'].includes(s))return'progress';if(['failed','gagal','dibatalkan','cancel','error'].includes(s))return'failed';return'pending';};const poFilterData=()=>{const q=document.getElementById('poSearch').value.trim().toLowerCase();const statusFilter=document.getElementById('poStatus').value;return poState.allData.filter(item=>{if(poState.displayMode==='detailed'){const[,,,product,,nickname,,idGift]=item;const match=(product||'').toLowerCase().includes(q)||(nickname||'').toLowerCase().includes(q)||(idGift||'').toLowerCase().includes(q);return match&&(statusFilter==='all'||normalizeStatus(item[6])===statusFilter);}else{const[orderNum,product]=item;const match=(orderNum||'').toLowerCase().includes(q)||(product||'').toLowerCase().includes(q);return match&&(statusFilter==='all'||normalizeStatus(item[2])===statusFilter);}});};const poUpdatePagination=(cur,total)=>{document.getElementById('poPrev').disabled=cur<=1;document.getElementById('poNext').disabled=cur>=total;};const poRender=()=>{const poList=document.getElementById('poList');const poTotal=document.getElementById('poTotal');if(!poList||!poTotal)return;const filtered=poFilterData();poTotal.textContent=`${poState.allData.length} total pesanan${filtered.length!==poState.allData.length?`, ${filtered.length} ditemukan`:''}`;const totalPages=Math.max(1,Math.ceil(filtered.length/poState.perPage));poState.currentPage=Math.min(Math.max(1,poState.currentPage),totalPages);const pageData=filtered.slice((poState.currentPage-1)*poState.perPage,poState.currentPage*poState.perPage);poList.innerHTML='';if(pageData.length===0){poList.innerHTML=`<div class="empty">Tidak Ada Hasil Ditemukan</div>`;poUpdatePagination(0,0);return;}const frag=document.createDocumentFragment();pageData.forEach(item=>{const card=document.createElement('article');if(poState.displayMode==='detailed'){const[tglOrder,estPengiriman,,product,bulan,name,status]=item;const detailsHtml=[{l:'TGL ORDER',v:tglOrder},{l:'BULAN',v:bulan}].filter(d=>d.v).map(d=>`<div class="detail-item"><div class="detail-label">${d.l}</div><div class="detail-value">${d.v}</div></div>`).join('');card.className=`card ${detailsHtml?'clickable':''}`;card.innerHTML=`<div class="card-header"><div><div class="card-name">${name||'Tanpa Nama'}</div><div class="card-product">${product||'N/A'}</div></div><div class="status-badge ${normalizeStatus(status)}">${status||'Pending'}</div></div>${estPengiriman?`<div class="card-date">Estimasi Pengiriman: ${estPengiriman} 20:00 WIB</div>`:''}${detailsHtml?`<div class="card-details"><div class="details-grid">${detailsHtml}</div></div>`:''}`;if(detailsHtml)card.addEventListener('click',()=>card.classList.toggle('expanded'));}else{const[orderNum,product,status]=item;card.className='card';card.innerHTML=`<div class="card-header"><div><div class="card-name">${orderNum||'Tanpa Nomor'}</div><div class="card-product">${product||'N/A'}</div></div><div class="status-badge ${normalizeStatus(status)}">${status||'Pending'}</div></div>`;}frag.appendChild(card);});poList.appendChild(frag);poUpdatePagination(poState.currentPage,totalPages);};const poSortByStatus=(data,mode)=>{const order={'progress':1,'pending':2,'success':3,'failed':4};const statusIndex=mode==='detailed'?6:2;return data.sort((a,b)=>order[normalizeStatus(a[statusIndex])]-order[normalizeStatus(b[statusIndex])]);};async function poFetch(sheetName){const poList=document.getElementById('poList');const poTotal=document.getElementById('poTotal');const skeletonCardTmpl=document.getElementById('skeletonCardTmpl');if(!poList||!poTotal||!skeletonCardTmpl)return;poTotal.textContent='Memuat data...';showSkeleton(poList,skeletonCardTmpl,5);poState.displayMode=sheetName===SHEETS.preorder.name1?'detailed':'simple';try{const res=await fetch(sheetUrlCSV(sheetName),{cache:'no-store'});if(!res.ok)throw new Error('Network error');const text=await res.text();let rows=text.trim().split('\n').map(r=>r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,'').trim()));rows.shift();poState.allData=poSortByStatus(rows.filter(row=>row&&row[0]),poState.displayMode);}catch(e){poState.allData=[];poTotal.textContent='Gagal memuat data.';console.error('Fetch Pre-Order failed:',e);}finally{poState.currentPage=1;poRender();}}
    async function accountsInit(){if(accState.initialized)return;const accountSelect=document.getElementById('accountSelect');const accountError=document.getElementById('accountError');if(!accountSelect||!accountError)return;accountError.style.display='none';try{const res=await fetch(sheetUrlCSV(SHEETS.accounts.name),{cache:'no-store'});if(!res.ok)throw new Error('Network error');const text=await res.text();accState.data=await parseAccountsSheet(text);populateAccountSelect();}catch(err){console.error("Fetch Akun Game failed:",err);accountError.textContent='Gagal memuat data akun.';accountError.style.display='block';document.getElementById('accountEmpty').style.display='none';accountSelect.innerHTML='<option value="">Gagal memuat</option>';}accountSelect.addEventListener('change',e=>{if(e.target.value!==""){renderAccount(parseInt(e.target.value,10));}else{document.getElementById('accountDisplay').style.display='none';document.getElementById('accountEmpty').style.display='block';accState.currentAccount=null;}});document.getElementById('accountDisplay')?.addEventListener('click',e=>{if(!e.target.closest('.action-btn, .carousel-btn'))e.currentTarget.classList.toggle('expanded');});document.getElementById('buyAccountBtn')?.addEventListener('click',e=>{e.stopPropagation();if(accState.currentAccount)openPaymentModal({title:accState.currentAccount.title,price:accState.currentAccount.price,catLabel:'Akun Game'});});document.getElementById('offerAccountBtn')?.addEventListener('click',e=>{e.stopPropagation();if(accState.currentAccount)window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Halo, saya tertarik menawar Akun Game: ${accState.currentAccount.title}`)}`,'_blank','noopener');});initCarousel();accState.initialized=true;}
    async function parseAccountsSheet(text){const rows=text.trim().replace(/\r\n/g,'\n').split('\n');rows.shift();return rows.map(row=>{const cols=row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,'').trim());return{title:cols[0]||"Tanpa Judul",price:Number(cols[1])||0,status:cols[2]||"Tersedia",description:cols[3]||"Tidak ada deskripsi.",images:(cols[4]||"").split(',').map(url=>url.trim()).filter(Boolean)}}).filter(a=>a.title!=="Tanpa Judul");}
    function populateAccountSelect(){const accountSelect=document.getElementById('accountSelect');const accountEmpty=document.getElementById('accountEmpty');if(!accountSelect||!accountEmpty)return;accountSelect.innerHTML='<option value="">Pilih Akun</option>';if(accState.data.length===0){accountSelect.innerHTML='<option value="">Tidak ada akun</option>';accountEmpty.textContent='Tidak ada akun yang tersedia saat ini.';accountEmpty.style.display='block';return;}accState.data.forEach((acc,index)=>{const option=document.createElement('option');option.value=index;option.textContent=acc.title;accountSelect.appendChild(option);});}
    function renderAccount(index){const accountDisplay=document.getElementById('accountDisplay');const accountEmpty=document.getElementById('accountEmpty');const carouselTrack=document.getElementById('carouselTrack');if(!accountDisplay||!accountEmpty||!carouselTrack)return;const account=accState.data[index];accState.currentAccount=account;if(!account){accountDisplay.style.display='none';accountEmpty.style.display='block';return;}accountDisplay.classList.remove('expanded');document.getElementById('accountPrice').textContent=toIDR(account.price);document.getElementById('accountDescription').textContent=account.description;const statusEl=document.getElementById('accountStatus');statusEl.textContent=account.status;statusEl.className='account-status-badge';statusEl.classList.add(account.status.toLowerCase()==='tersedia'?'available':'sold');carouselTrack.innerHTML='';if(account.images.length>0){account.images.forEach(src=>{carouselTrack.insertAdjacentHTML('beforeend',`<div class="carousel-slide"><img src="${src}" alt="Gambar untuk ${account.title}" loading="lazy"></div>`);});}else{carouselTrack.innerHTML=`<div class="carousel-slide" style="display:flex;align-items:center;justify-content:center;aspect-ratio:16/9;background-color:var(--surface-secondary);color:var(--text-tertiary);">Gambar tidak tersedia</div>`;}accState.currentIndex=0;updateCarousel();accountEmpty.style.display='none';accountDisplay.style.display='block';}
    function updateCarousel(){const account=accState.currentAccount;if(!account)return;const totalSlides=account.images.length;document.getElementById('carouselTrack').style.transform=`translateX(-${accState.currentIndex*100}%)`;document.getElementById('carouselPrev').disabled=totalSlides<=1||accState.currentIndex===0;document.getElementById('carouselNext').disabled=totalSlides<=1||accState.currentIndex>=totalSlides-1;}
    function initCarousel(){const track=document.getElementById('carouselTrack');const prev=document.getElementById('carouselPrev');const next=document.getElementById('carouselNext');if(!track||!prev||!next)return;prev.addEventListener('click',e=>{e.stopPropagation();if(accState.currentIndex>0){accState.currentIndex--;updateCarousel();}});next.addEventListener('click',e=>{e.stopPropagation();if(accState.currentIndex<accState.currentAccount.images.length-1){accState.currentIndex++;updateCarousel();}});let touchStartX=0;track.addEventListener('touchstart',e=>{e.stopPropagation();touchStartX=e.changedTouches[0].screenX;},{passive:true});track.addEventListener('touchend',e=>{e.stopPropagation();const touchEndX=e.changedTouches[0].screenX;if(touchEndX<touchStartX-50)next.click();if(touchEndX>touchStartX+50)prev.click();},{passive:true});}

    // ========= INISIALISASI UTAMA APLIKASI =========
    function init() {
        console.log("Inisialisasi aplikasi...");
        // Pasang event listener utama
        document.getElementById('hamburgerBtn')?.addEventListener('click', toggleMenu);
        document.getElementById('appOverlay')?.addEventListener('click', closeMenu);
        document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);

        // Pasang event listener untuk kontrol di dalam view
        document.getElementById('custom-select-btn')?.addEventListener('click', () => toggleCustomSelect());
        document.addEventListener('click', (e) => {
            const customSelectWrapper = document.getElementById('custom-select-wrapper');
            if (customSelectWrapper && !customSelectWrapper.contains(e.target)) {
                toggleCustomSelect(false);
            }
        });
        const searchEl = document.getElementById('search');
        if (searchEl) {
            let debounceTimer;
            searchEl.addEventListener('input', e => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    query = e.target.value.trim().toLowerCase();
                    renderList();
                }, 200);
            });
        }
        document.getElementById('closeModalBtn')?.addEventListener('click', closePaymentModal);
        document.getElementById('paymentModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'paymentModal') closePaymentModal();
        });

        // Jalankan fungsi awal
        renderNewMenu();
        initTheme();
        loadCatalog();
        console.log("Aplikasi siap.");
    }

    // Jalankan semuanya setelah halaman HTML selesai dimuat
    document.addEventListener('DOMContentLoaded', init);
})();
