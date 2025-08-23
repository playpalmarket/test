(function(){
  // ========= CONFIG =========
  const SHEET_ID='1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
  const SHEETS={katalog:{name:'Sheet3'},preorder:{name1:'Sheet1',name2:'Sheet2'}};
  const WA_NUMBER='6285877001999';
  const WA_GREETING='*Detail pesanan:*';

  let DATA=[],CATS=[],activeCat='',query='';

  // ========= ELEMENTS =========
  const viewCatalog=document.getElementById('viewCatalog');
  const viewPreorder=document.getElementById('viewPreorder');

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
  const burgerPO =document.getElementById('burgerPO');
  const menuCat  =document.getElementById('menuCat');
  const menuPO   =document.getElementById('menuPO');

  // ========= MENU & MODE SWITCHER =========
  function closeAllMenus(){
    [burgerCat,burgerPO].forEach(b=>b && b.classList.remove('active'));
    [menuCat,menuPO].forEach(m=>m && m.classList.remove('open'));
  }
  function toggleMenu(which){
    const btn = which==='cat'?burgerCat:burgerPO;
    const menu= which==='cat'?menuCat:menuPO;
    const open= menu.classList.contains('open');
    closeAllMenus();
    if(!open){ btn?.classList.add('active'); menu?.classList.add('open'); }
  }
  burgerCat?.addEventListener('click',()=>toggleMenu('cat'));
  burgerPO ?.addEventListener('click',()=>toggleMenu('po'));
  document.getElementById('closeMenuCat')?.addEventListener('click',closeAllMenus);
  document.getElementById('closeMenuPO') ?.addEventListener('click',closeAllMenus);
  document.addEventListener('click',(e)=>{
    const inside = (menuCat?.contains(e.target)||burgerCat?.contains(e.target)||menuPO?.contains(e.target)||burgerPO?.contains(e.target));
    if(!inside) closeAllMenus();
  });

  function setMode(next){
    viewCatalog.style.display = next==='katalog' ? 'block' : 'none';
    viewPreorder.style.display= next==='preorder' ? 'block' : 'none';
    closeAllMenus();
    if(next==='preorder' && !poState.initialized) poInit();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  [...(menuCat?.querySelectorAll('.menu-btn[data-mode]')||[]),
   ...(menuPO ?.querySelectorAll('.menu-btn[data-mode]')||[])]
    .forEach(btn=>btn.addEventListener('click',()=>setMode(btn.getAttribute('data-mode'))));

  // ========= UTILS =========
  const prettyLabel=(raw)=>String(raw||'').trim().replace(/\s+/g,' ');
  const toIDR=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v);
  const sheetUrlJSON=(sheetName)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  const sheetUrlCSV =(sheetName)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

  // ========= SKELETON LOADER UTILS =========
  function showSkeleton(container, template, count = 6) {
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      frag.appendChild(template.content.cloneNode(true));
    }
    container.appendChild(frag);
  }

  // ========= KATALOG =========
  function parseGVizPairs(txt){
    const m=txt.match(/\{.*\}/s); if(!m) throw new Error('Invalid GViz response.');
    const obj=JSON.parse(m[0]); const table=obj.table||{}, rows=table.rows||[], cols=table.cols||[];
    const pairs=Array.from({length:Math.floor(cols.length/2)},(_,i)=>({iTitle:i*2,iPrice:i*2+1,label:cols[i*2]?.label||''}))
      .filter(p=>p.label&&cols[p.iPrice]);
    const out=[];
    for(const r of rows){ const c=r.c||[];
      for(const p of pairs){
        const title=String(c[p.iTitle]?.v||'').trim();
        const priceRaw=c[p.iPrice]?.v; const price=(priceRaw!=null&&priceRaw!=='')?Number(priceRaw):NaN;
        if(title&&!isNaN(price)) out.push({catKey:p.label,catLabel:prettyLabel(p.label),title,price});
      }
    }
    return out;
  }

  function toggleCustomSelect(open){
    const isOpen=typeof open==='boolean'?open:!customSelectWrapper.classList.contains('open');
    customSelectWrapper.classList.toggle('open',isOpen);
    customSelectBtn.setAttribute('aria-expanded',isOpen);
  }
  customSelectBtn.addEventListener('click',()=>toggleCustomSelect());
  document.addEventListener('click',(e)=>{
    if(!customSelectWrapper.contains(e.target) && !customSelectBtn.contains(e.target)) toggleCustomSelect(false);
  });

  function buildGameSelect(){
    const map=new Map(); DATA.forEach(it=>{ if(!map.has(it.catKey)) map.set(it.catKey,it.catLabel); });
    CATS=[...map].map(([key,label])=>({key,label}));

    customSelectOptions.innerHTML='';
    CATS.forEach((c,idx)=>{
      const el=document.createElement('div');
      el.className='custom-select-option'; el.textContent=c.label; el.dataset.value=c.key; el.setAttribute('role','option');
      if(idx===0) el.classList.add('selected');
      el.addEventListener('click',()=>{
        activeCat=c.key; customSelectValue.textContent=c.label;
        document.querySelector('.custom-select-option.selected')?.classList.remove('selected');
        el.classList.add('selected'); toggleCustomSelect(false); renderList();
      });
      customSelectOptions.appendChild(el);
    });

    if(CATS.length>0){ activeCat=CATS[0].key; customSelectValue.textContent=CATS[0].label; }
    else{ customSelectValue.textContent="Data tidak tersedia"; }
  }

  function renderList(){
    const items=DATA.filter(x=>x.catKey===activeCat&&(query===''||x.title.toLowerCase().includes(query)||String(x.price).includes(query)));
    listEl.innerHTML='';
    if(items.length===0){ listEl.innerHTML=`<div class="empty">Tidak ada hasil ditemukan.</div>`; countInfoEl.textContent=''; return; }
    const frag=document.createDocumentFragment();
    for(const it of items){
      const clone=itemTmpl.content.cloneNode(true);
      const link=clone.querySelector('.list-item');
      link.querySelector('.title').textContent=it.title;
      link.querySelector('.price').textContent=toIDR(it.price);
      const text=`${WA_GREETING}\n› Tipe: Katalog\n› Game: ${it.catLabel}\n› Item: ${it.title}\n› Harga: ${toIDR(it.price)}`;
      link.href=`https.wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
      frag.appendChild(clone);
    }
    listEl.appendChild(frag);
    countInfoEl.textContent=`${items.length} item ditemukan`;
  }

  let debounceTimer;
  searchEl.addEventListener('input',e=>{
    clearTimeout(debounceTimer);
    debounceTimer=setTimeout(()=>{ query=e.target.value.trim().toLowerCase(); renderList(); },200);
  });

  async function loadCatalog(){
    try{
      errBox.style.display='none';
      showSkeleton(listEl, skeletonItemTmpl, 9);
      const res=await fetch(sheetUrlJSON(SHEETS.katalog.name),{cache:'no-store'});
      if(!res.ok) throw new Error(`Network response was not ok: ${res.statusText}`);
      const txt=await res.text();
      DATA=parseGVizPairs(txt);
      if(DATA.length===0) throw new Error('Data kosong atau format kolom tidak sesuai.');
      buildGameSelect(); renderList();
    }catch(err){
      console.error("Fetch Katalog failed:",err);
      listEl.innerHTML = '';
      errBox.style.display='block'; errBox.textContent=`Oops, terjadi kesalahan. Silakan coba beberapa saat lagi.`;
    }
  }

  // ========= PRE-ORDER (MEKANISME BERDASARKAN URUTAN KOLOM) =========
  const poSearch=document.getElementById('poSearch');
  const poStatus=document.getElementById('poStatus');
  const poSheet =document.getElementById('poSheet');
  const poList  =document.getElementById('poList');
  const poPrev  =document.getElementById('poPrev');
  const poNext  =document.getElementById('poNext');
  const poTotal =document.getElementById('poTotal');

  const poState={initialized:false,allData:[],currentPage:1,perPage:15};

  const normalizeStatus=(raw)=>{ const s=String(raw||'').trim().toLowerCase();
    if(['success','selesai','berhasil','done'].includes(s)) return 'success';
    if(['progress','proses','diproses','processing'].includes(s)) return 'progress';
    if(['failed','gagal','dibatalkan','cancel','error'].includes(s)) return 'failed';
    return 'pending';
  };

  const poFilterData=()=>{
    const q=poSearch.value.trim().toLowerCase();
    const statusFilter=poStatus.value;
    return poState.allData.filter(item=>{
      const product   = (item[3] || '').toLowerCase(); // Kolom D
      const nickname  = (item[5] || '').toLowerCase(); // Kolom F
      const idGift    = (item[7] || '').toLowerCase(); // Kolom H
      const match = product.includes(q) || nickname.includes(q) || idGift.includes(q);
      
      const status = normalizeStatus(item[6]); // Kolom G
      return match && (statusFilter === 'all' || status === statusFilter);
    });
  };

  const poUpdatePagination=(cur,total)=>{ poPrev.disabled=cur<=1; poNext.disabled=cur>=total; };

  const poRender=()=>{
    const filtered=poFilterData();
    const totalItems=poState.allData.length;
    poTotal.textContent=`${totalItems} total pesanan${filtered.length!==totalItems?`, ${filtered.length} ditemukan`:''}`;

    const totalPages=Math.max(1,Math.ceil(filtered.length/poState.perPage));
    poState.currentPage=Math.min(Math.max(1,poState.currentPage),totalPages);
    const start=(poState.currentPage-1)*poState.perPage;
    const pageData=filtered.slice(start, start+poState.perPage);

    poList.innerHTML='';
    if(pageData.length===0){ poList.innerHTML=`<div class="empty">Tidak Ada Hasil Ditemukan</div>`; poUpdatePagination(0,0); return; }

    const frag=document.createDocumentFragment();
    pageData.forEach(item=>{
      // Ambil data berdasarkan urutan kolom yang BENAR
      const tglOrder      = item[0]; // Kolom A
      const estPengiriman = item[1]; // Kolom B
      // Kolom C (Nomor Telepon) tidak ditampilkan
      const product       = item[3]; // Kolom D
      const bulan         = item[4]; // Kolom E
      const name          = item[5]; // Kolom F
      const status        = item[6]; // Kolom G
      // Kolom H (ID Gift) tidak ditampilkan

      const statusClass = normalizeStatus(status);
      const estDeliveryText = estPengiriman ? `Estimasi Pengiriman: ${estPengiriman} 20:00 WIB` : '';
      
      const details = [
        { label: 'TGL ORDER', value: tglOrder },
        { label: 'BULAN', value: bulan }
      ];
      const detailsHtml = details
        .filter(d => d.value && String(d.value).trim() !== '')
        .map(d => `<div class="detail-item"><div class="detail-label">${d.label}</div><div class="detail-value">${d.value}</div></div>`)
        .join('');

      const card=document.createElement('article');
      card.className=`card ${detailsHtml ? 'clickable' : ''}`;
      card.innerHTML=`
        <div class="card-header">
          <div>
            <div class="card-name">${name || 'Tanpa Nama'}</div>
            <div class="card-product">${product || 'N/A'}</div>
          </div>
          <div class="status-badge ${statusClass}">${(status || 'Pending').toUpperCase()}</div>
        </div>
        ${estDeliveryText ? `<div class="card-date">${estDeliveryText}</div>` : ''}
        ${detailsHtml ? `<div class="card-details"><div class="details-grid">${detailsHtml}</div></div>` : ''}
      `;

      if(detailsHtml) card.addEventListener('click',()=>card.classList.toggle('expanded'));
      frag.appendChild(card);
    });
    poList.appendChild(frag); poUpdatePagination(poState.currentPage,totalPages);
  };

  const poSortByStatus=(data)=>{
    const order={'progress':1,'pending':2,'success':3,'failed':4};
    return data.sort((a,b)=>order[normalizeStatus(a[6])]-order[normalizeStatus(b[6])]); // Kolom G
  };

  async function poFetch(sheetName){
    poTotal.textContent='Memuat data...';
    showSkeleton(poList, skeletonCardTmpl, 5);
    try{
      const res=await fetch(sheetUrlCSV(sheetName),{cache:'no-store'});
      if(!res.ok) throw new Error(`Network response was not ok: ${res.statusText}`);
      const text=await res.text();
      let rows=text.trim().split('\n').map(r=>r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,'').trim()));
      
      if(rows.length < 2){
        poState.allData=[];
        return;
      }

      rows.shift();
      
      const dataRows = rows.filter(row => row && (row[0] || '').trim() !== '');
      poState.allData = poSortByStatus(dataRows);

    }catch(e){
      poState.allData=[]; poTotal.textContent='Gagal memuat data.'; console.error('Fetch Pre-Order failed:',e);
    }finally{ poState.currentPage=1; poRender(); }
  }

  function poInit(){
    const rebound=()=>{ poState.currentPage=1; poRender(); };
    poSearch.addEventListener('input',rebound);
    poStatus.addEventListener('change',rebound);
    
    poSheet.addEventListener('change', e => {
      const selectedValue = e.target.value;
      const sheetToFetch = selectedValue === '0' ? SHEETS.preorder.name1 : SHEETS.preorder.name2;
      poFetch(sheetToFetch);
    });

    document.getElementById('poPrev').addEventListener('click',()=>{ if(poState.currentPage>1){ poState.currentPage--; poRender(); window.scrollTo({top:0,behavior:'smooth'});} });
    document.getElementById('poNext').addEventListener('click',()=>{ poState.currentPage++; poRender(); window.scrollTo({top:0,behavior:'smooth'});} );
    
    const initialSheet = poSheet.value === '0' ? SHEETS.preorder.name1 : SHEETS.preorder.name2;
    poFetch(initialSheet);
    
    poState.initialized=true;
  }

  // ========= START =========
  loadCatalog();
})();
