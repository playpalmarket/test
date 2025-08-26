(function(){
  // ========= CONFIG =========
  const SHEET_ID='1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
  const SHEETS={katalog:{name:'Sheet3'},preorder:{name1:'Sheet1',name2:'Sheet2'},accounts:{name:'Sheet5'}};
  const WA_NUMBER='6285877001999';
  const WA_GREETING='*Detail pesanan:*';
  let DATA=[],CATS=[],activeCat='';

  const PAYMENT_OPTIONS = [
    { id: 'seabank', name: 'Seabank', feeType: 'fixed', value: 0 },
    { id: 'gopay', name: 'Gopay', feeType: 'fixed', value: 0 },
    { id: 'dana', name: 'Dana', feeType: 'fixed', value: 125 },
    { id: 'bank_to_dana', name: 'Bank ke Dana', feeType: 'fixed', value: 500 },
    { id: 'qris', name: 'Qris', feeType: 'percentage', value: 0.01 }
  ];
  let currentSelectedItem = null;

  // ========= ELEMENTS =========
  const viewCatalog=document.getElementById('viewCatalog');
  const viewPreorder=document.getElementById('viewPreorder');
  const viewAccounts=document.getElementById('viewAccounts');

  // Katalog
  const listEl=document.getElementById('list-container');
  const searchEl=document.getElementById('search');
  const countInfoEl=document.getElementById('countInfo');
  const errBox=document.getElementById('error');
  const itemTmpl=document.getElementById('itemTmpl');
  const skeletonItemTmpl=document.getElementById('skeletonItemTmpl');
  const customSelectWrapper=document.getElementById('custom-select-wrapper');
  const customSelectBtn=document.getElementById('custom-select-btn');
  const customSelectValue=document.getElementById('custom-select-value');
  const customSelectOptions=document.getElementById('custom-select-options');

  // Payment Modal
  const paymentModal = document.getElementById('paymentModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalItemName = document.getElementById('modalItemName');
  const modalItemPrice = document.getElementById('modalItemPrice');
  const paymentOptionsContainer = document.getElementById('paymentOptions');
  const modalFee = document.getElementById('modalFee');
  const modalTotal = document.getElementById('modalTotal');
  const continueToWaBtn = document.getElementById('continueToWaBtn');

  // Pre-Order
  const poSearch=document.getElementById('poSearch');
  const poStatus=document.getElementById('poStatus');
  const poSheet=document.getElementById('poSheet');
  const poList=document.getElementById('poList');
  const poPrev=document.getElementById('poPrev');
  const poNext=document.getElementById('poNext');
  const poTotal=document.getElementById('poTotal');
  const poState={initialized:false,allData:[],currentPage:1,perPage:15,displayMode:'detailed'};

  // Akun Game
  const accountSelect=document.getElementById('accountSelect');
  const accountDisplay=document.getElementById('accountDisplay');
  const accountEmpty=document.getElementById('accountEmpty');
  const accountError=document.getElementById('accountError');
  const carouselTrack=document.getElementById('carouselTrack');
  const carouselPrev=document.getElementById('carouselPrev');
  const carouselNext=document.getElementById('carouselNext');
  const accountPrice=document.getElementById('accountPrice');
  const accountStatus=document.getElementById('accountStatus');
  const accountDescription=document.getElementById('accountDescription');
  const buyAccountBtn = document.getElementById('buyAccountBtn');
  const offerAccountBtn = document.getElementById('offerAccountBtn');
  const accState={initialized:false,data:[],currentIndex:0,currentAccount:null};

  // ========= THEME =========
  function applyTheme(theme){ document.body.classList.toggle('dark-mode', theme === 'dark'); }
  function initTheme(){ const saved=localStorage.getItem('theme'); const prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches; applyTheme(saved || (prefersDark?'dark':'light')); }
  function toggleTheme(){ const newTheme=document.body.classList.contains('dark-mode')?'light':'dark'; localStorage.setItem('theme',newTheme); applyTheme(newTheme); }

  // ========= UTILS =========
  function toIDR(x){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(x);}
  const sheetUrlJSON = name => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${name}`;
  const sheetUrlCSV  = name => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${name}`;

  function parseGVizPairs(txt){
    const json=JSON.parse(txt.substring(47).slice(0,-2));
    const rows=json.table.rows||[];
    return rows.map(r=>r.c.map(c=>c?.v??''));
  }

  // robust CSV (mengikuti parser di file lama)
  function parseCSV(text){
    const normalizedText = text.replace(/\r\n/g, '\n');
    let rows = [], currentRow = [], currentField = '', inQuotedField = false;
    for (let i=0;i<normalizedText.length;i++){
      const char = normalizedText[i];
      if(inQuotedField){
        if(char === '"'){
          if(i+1 < normalizedText.length && normalizedText[i+1] === '"'){ currentField+='"'; i++; }
          else{ inQuotedField=false; }
        }else{ currentField += char; }
      }else{
        if(char === '"'){ inQuotedField = true; }
        else if(char === ','){ currentRow.push(currentField); currentField=''; }
        else if(char === '\n'){ currentRow.push(currentField); rows.push(currentRow); currentRow=[]; currentField=''; }
        else{ currentField += char; }
      }
    }
    currentRow.push(currentField); rows.push(currentRow);
    return rows;
  }

  function showSkeleton(container, tmpl, count){
    container.innerHTML=''; const frag=document.createDocumentFragment();
    for(let i=0;i<count;i++){ frag.appendChild(tmpl.content.cloneNode(true)); }
    container.appendChild(frag);
  }

  // ========= KATALOG =========
  function buildGameSelect(){
    CATS=[...new Set(DATA.map(r=>r[0]).filter(Boolean))];
    customSelectOptions.innerHTML='';
    CATS.forEach((c,i)=>{
      const opt=document.createElement('div');
      opt.className='custom-select-option';
      opt.textContent=c;
      opt.dataset.value=c;
      opt.addEventListener('click',()=>{customSelectValue.textContent=c;activeCat=c;renderList();customSelectWrapper.classList.remove('open');});
      customSelectOptions.appendChild(opt);
      if(i===0){activeCat=c;customSelectValue.textContent=c;}
    });
  }

  function renderList(){
    if(!Array.isArray(DATA) || DATA.length===0){ errBox.style.display='block'; errBox.textContent='Data belum tersedia.'; return; }
    const q=(searchEl.value||'').toLowerCase();
    const items=DATA.filter(r=>r[0]===activeCat).map(r=>({catLabel:r[0],title:String(r[1]||''),price:Number(r[2]||0),id:r[3]}))
                    .filter(it=> it.title.toLowerCase().includes(q));
    listEl.innerHTML=''; const frag=document.createDocumentFragment();
    for(const it of items){
      const el=itemTmpl.content.cloneNode(true).firstElementChild;
      el.querySelector('.title').textContent=it.title;
      el.querySelector('.price').textContent=toIDR(it.price);
      el.addEventListener('click', ()=> openPaymentModal(it));
      frag.appendChild(el);
    }
    listEl.appendChild(frag);
    countInfoEl.textContent = `${items.length} item ditemukan`;
  }

  async function loadCatalog(){
    try{
      errBox.style.display='none';
      showSkeleton(listEl, skeletonItemTmpl, 9);
      const res=await fetch(sheetUrlJSON(SHEETS.katalog.name),{cache:'no-store'});
      if(!res.ok) throw new Error(res.statusText);
      const txt=await res.text();
      DATA=parseGVizPairs(txt);
      if(DATA.length===0) throw new Error('Data kosong');
      buildGameSelect(); renderList();
    }catch(err){
      console.error('Fetch Katalog failed:', err);
      listEl.innerHTML=''; errBox.style.display='block'; errBox.textContent='Oops, terjadi kesalahan. Coba lagi nanti.';
    }
  }

  // ========= PAYMENT =========
  function calculateFee(price, option){
    if(option.feeType==='fixed') return option.value;
    if(option.feeType==='percentage') return Math.ceil(price*option.value);
    return 0;
  }
  function updateWaLink(option, fee, total){
    const { catLabel, title, price } = currentSelectedItem;
    const text = `${WA_GREETING}\n› Tipe: ${catLabel}\n› Item: ${title}\n› Pembayaran: ${option.name}\n› Harga: ${toIDR(price)}\n› Fee: ${toIDR(fee)}\n› Total: ${toIDR(total)}`;
    continueToWaBtn.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  }
  function updatePriceDetails(){
    const selectedId=(paymentOptionsContainer.querySelector('input[name="payment"]:checked')||{}).value;
    const opt = PAYMENT_OPTIONS.find(o=>o.id===selectedId);
    if(!opt) return;
    const fee = calculateFee(currentSelectedItem.price, opt);
    const total = currentSelectedItem.price + fee;
    modalFee.textContent = toIDR(fee);
    modalTotal.textContent = toIDR(total);
    updateWaLink(opt, fee, total);
  }
  function openPaymentModal(item){
    currentSelectedItem = item;
    modalItemName.textContent = item.title;
    modalItemPrice.textContent = toIDR(item.price);
    paymentOptionsContainer.innerHTML='';
    PAYMENT_OPTIONS.forEach((opt,i)=>{
      const fee = calculateFee(item.price, opt);
      paymentOptionsContainer.insertAdjacentHTML('beforeend', `
        <div class="payment-option">
          <input type="radio" id="${opt.id}" name="payment" value="${opt.id}" ${i===0?'checked':''}>
          <label for="${opt.id}">${opt.name}<span style="float:right;">+ ${toIDR(fee)}</span></label>
        </div>
      `);
    });
    paymentOptionsContainer.querySelectorAll('input[name="payment"]').forEach(i=>i.addEventListener('change',updatePriceDetails));
    updatePriceDetails();
    paymentModal.style.display='flex'; setTimeout(()=>paymentModal.classList.add('visible'),10);
  }
  function closePaymentModal(){ paymentModal.classList.remove('visible'); setTimeout(()=>{paymentModal.style.display='none'; currentSelectedItem=null;},200); }

  // ========= PRE-ORDER =========
  const normalizeStatus=(raw)=>{const s=String(raw||'').trim().toLowerCase();
    if(['success','selesai','berhasil','done'].includes(s))return'success';
    if(['progress','proses','diproses','processing'].includes(s))return'progress';
    if(['failed','gagal','dibatalkan','cancel','error'].includes(s))return'failed';
    return'pending';};

  function poFilterData(){
    const q=(poSearch.value||'').trim().toLowerCase();
    const statusFilter=poStatus.value;
    return poState.allData.filter(item=>{
      // Sheet1/2 (detailed): [tgl, est, product, bulan, name, status, idgift]
      const product=(item[3]||'').toLowerCase();
      const nickname=(item[5]||'').toLowerCase();
      const idGift=(item[7]||'').toLowerCase?.() || '';
      const match=product.includes(q)||nickname.includes(q)||idGift.includes(q);
      const status=normalizeStatus(item[6]);
      return match&&(statusFilter==='all'||status===statusFilter);
    });
  }

  function poUpdatePagination(cur,total){ poPrev.disabled=cur<=1; poNext.disabled=cur>=total; }

  function poRender(){
    const filtered=poFilterData();
    const totalItems=poState.allData.length;
    poTotal.textContent=`${totalItems} total pesanan${filtered.length!==totalItems?`, ${filtered.length} ditemukan`:''}`;
    const totalPages=Math.max(1,Math.ceil(filtered.length/poState.perPage));
    poState.currentPage=Math.min(Math.max(1,poState.currentPage),totalPages);
    const start=(poState.currentPage-1)*poState.perPage;
    const pageData=filtered.slice(start,start+poState.perPage);

    poList.innerHTML='';
    if(pageData.length===0){ poList.innerHTML='<div class="empty">Tidak Ada Hasil Ditemukan</div>'; poUpdatePagination(0,0); return; }

    const frag=document.createDocumentFragment();
    pageData.forEach(item=>{
      const card=document.createElement('article');
      card.className='card';
      const tglOrder=item[0], est=item[1], product=item[3], bulan=item[4], name=item[5], status=normalizeStatus(item[6]), id=(item[7]||'');
      card.innerHTML=`
        <header class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
          <div><strong>${product}</strong><div style="color:var(--text-secondary)">${name} • ${bulan}</div></div>
          <span class="status-badge ${status}">${status}</span>
        </header>
        <div class="card-body" style="margin-top:8px;color:var(--text-secondary);font-size:14px">
          Tgl Order: ${tglOrder} • Est: ${est} • ID: ${id || '-'}
        </div>
      `;
      frag.appendChild(card);
    });
    poList.appendChild(frag);
    poUpdatePagination(poState.currentPage,totalPages);
  }

  async function loadPreorder(){
    try{
      const sheetName = poSheet.value || SHEETS.preorder.name1;
      const res = await fetch(sheetUrlCSV(sheetName), {cache:'no-store'});
      if(!res.ok) throw new Error(res.statusText);
      const text = await res.text();
      const rows = parseCSV(text);
      // buang header
      poState.allData = rows.slice(1);
      poState.currentPage = 1;
      poRender();
      poState.initialized = true;
    }catch(err){
      console.error('Fetch Preorder failed:',err);
      poList.innerHTML='<div class="err">Gagal memuat data.</div>';
    }
  }

  // ========= AKUN GAME =========
  async function parseAccountsSheet(text){
    const rows = parseCSV(text); // header: Title, Price, Status, Description, Images
    const accounts=[];
    for(let i=1;i<rows.length;i++){
      const row=rows[i];
      if(!row || row.length<2) continue;
      const accountData={
        title: row[0] || 'Akun',
        price: Number((row[1]||'').toString().replace(/[^\d]/g,'')) || 0,
        status: (row[2]||'').trim() || 'Tersedia',
        description: row[3] || '',
        images: (row[4] || '').split(',').map(u=>u.trim()).filter(Boolean)
      };
      accounts.push(accountData);
    }
    return accounts;
  }

  function populateAccountSelect(){
    accountSelect.innerHTML='<option value="">Pilih Akun</option>';
    if(accState.data.length===0){ accountSelect.innerHTML='<option value="">Tidak ada akun</option>'; accountEmpty.textContent='Tidak ada akun yang tersedia saat ini.'; accountEmpty.style.display='block'; return; }
    accState.data.forEach((acc,idx)=>{ const o=document.createElement('option'); o.value=idx; o.textContent=acc.title; accountSelect.appendChild(o); });
  }

  function renderAccount(index){
    const account=accState.data[index]; accState.currentAccount=account;
    if(!account){ accountDisplay.style.display='none'; accountEmpty.style.display='block'; return; }
    accountPrice.textContent=toIDR(account.price);
    accountDescription.textContent=account.description;
    accountStatus.textContent=account.status;
    accountStatus.className='account-status-badge';
    accountStatus.classList.add(account.status.toLowerCase()==='tersedia'?'available':'sold');

    carouselTrack.innerHTML='';
    if(account.images && account.images.length){
      account.images.forEach(src=>{ const slide=document.createElement('div'); slide.className='carousel-slide'; const img=document.createElement('img'); img.src=src; img.alt=`Gambar untuk ${account.title}`; img.loading='lazy'; slide.appendChild(img); carouselTrack.appendChild(slide); });
    }else{
      const slide=document.createElement('div'); slide.className='carousel-slide';
      slide.innerHTML='<div class="no-image-placeholder" style="display:flex;align-items:center;justify-content:center;height:100%;aspect-ratio:16/9;background:var(--brand-accent-bg);color:var(--brand-accent-text);">Gambar tidak tersedia</div>';
      carouselTrack.appendChild(slide);
    }
    accState.currentIndex=0; updateCarousel();
    accountEmpty.style.display='none'; accountDisplay.style.display='block';
  }

  function updateCarousel(){
    if(accountSelect.value==="") return;
    const account=accState.data[accountSelect.value]; if(!account) return;
    const total=account.images.length||0;
    carouselTrack.style.transform=`translateX(-${accState.currentIndex*100}%)`;
    carouselPrev.disabled = total <= 1;
    carouselNext.disabled = total <= 1 || accState.currentIndex >= total - 1;
  }

  function initCarousel(){
    carouselPrev.addEventListener('click', (e)=>{ e.stopPropagation(); if(accState.currentIndex>0){ accState.currentIndex--; updateCarousel(); }});
    carouselNext.addEventListener('click', (e)=>{ e.stopPropagation(); if(accountSelect.value==="") return; const total = accState.data[accountSelect.value].images.length; if(accState.currentIndex<total-1){ accState.currentIndex++; updateCarousel(); }});
    let sx=0, ex=0;
    carouselTrack.addEventListener('touchstart', e=>{ e.stopPropagation(); sx=e.changedTouches[0].screenX; }, {passive:true});
    carouselTrack.addEventListener('touchend', e=>{ e.stopPropagation(); ex=e.changedTouches[0].screenX; if(ex < sx-50) carouselNext.click(); if(ex > sx+50) carouselPrev.click(); }, {passive:true});
  }

  async function accountsInit(){
    if(accState.initialized) return;
    accountError.style.display='none';
    try{
      const res = await fetch(sheetUrlCSV(SHEETS.accounts.name), {cache:'no-store'});
      if(!res.ok) throw new Error(res.statusText);
      const text = await res.text();
      accState.data = await parseAccountsSheet(text);
      populateAccountSelect();
      accState.initialized=true;
    }catch(err){
      console.error("Fetch Akun Game failed:", err);
      accountError.textContent='Gagal memuat data akun. Coba lagi nanti.'; accountError.style.display='block';
    }
  }

  // ========= MODE SWITCH =========
  function setMode(mode){
    document.querySelectorAll('.view-section').forEach(s=>s.classList.remove('active'));
    if(mode==='katalog'){ viewCatalog.classList.add('active'); loadCatalog(); }
    if(mode==='preorder'){ viewPreorder.classList.add('active'); if(!poState.initialized) loadPreorder(); else poRender(); }
    if(mode==='accounts'){ viewAccounts.classList.add('active'); accountsInit(); }
    window.scrollTo({top:0, behavior:'smooth'});
  }

  // ========= LISTENERS =========
  // custom select
  customSelectBtn?.addEventListener('click', ()=> customSelectWrapper.classList.toggle('open'));
  document.addEventListener('click', (e)=>{ if(!customSelectWrapper.contains(e.target)) customSelectWrapper.classList.remove('open'); });

  searchEl?.addEventListener('input', renderList);

  // modal
  closeModalBtn?.addEventListener('click', closePaymentModal);
  paymentModal?.addEventListener('click', (e)=>{ if(e.target===paymentModal) closePaymentModal(); });

  // theme
  document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);

  // preorder
  poSearch?.addEventListener('input', ()=>{ poState.currentPage=1; poRender(); });
  poStatus?.addEventListener('change', ()=>{ poState.currentPage=1; poRender(); });
  poSheet?.addEventListener('change', ()=>{ poState.currentPage=1; loadPreorder(); });
  poPrev?.addEventListener('click', ()=>{ if(poState.currentPage>1){ poState.currentPage--; poRender(); }});
  poNext?.addEventListener('click', ()=>{ poState.currentPage++; poRender(); });

  // akun
  accountSelect?.addEventListener('change', ()=>{ if(accountSelect.value!=='') renderAccount(Number(accountSelect.value)); });
  buyAccountBtn?.addEventListener('click', ()=>{ const acc=accState.currentAccount; if(!acc) return; openPaymentModal({catLabel:'Akun Game', title:acc.title, price:acc.price}); });
  offerAccountBtn?.addEventListener('click', ()=>{ const acc=accState.currentAccount; if(!acc) return; openPaymentModal({catLabel:'Akun Game (Tawar)', title:acc.title, price:acc.price}); });
  initCarousel();

  // ========= EXPORT untuk sidebar =========
  window.AppNavigation = { setMode };

  // ========= INIT =========
  initTheme();
  setMode('katalog');
})();
