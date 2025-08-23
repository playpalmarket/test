(function(){
  // ========= CONFIG =========
  const SHEET_ID='1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
  const SHEETS={katalog:{name:'Sheet3'},preorder:{name1:'Sheet1',name2:'Sheet2'}};
  const WA_NUMBER='6285877001999';
  const WA_GREETING='*Detail pesanan:*';
  const PO_ITEMS_PER_PAGE = 15;

  let DATA=[],CATS=[],activeCat='',query='';

  // ========= ELEMENTS =========
  const viewCatalog=document.getElementById('viewCatalog');
  const viewPreorder=document.getElementById('viewPreorder');
  // Catalog elements
  const listEl=document.getElementById('list-container');
  const searchEl=document.getElementById('search');
  const countInfoEl=document.getElementById('countInfo');
  const itemTmpl=document.getElementById('itemTmpl');
  const errBox=document.getElementById('error');
  const customSelectWrapper=document.getElementById('custom-select-wrapper');
  const customSelectBtn=document.getElementById('custom-select-btn');
  const customSelectValue=document.getElementById('custom-select-value');
  const customSelectOptions=document.getElementById('custom-select-options');
  const burgerCat=document.getElementById('burgerCat');
  const menuCat  =document.getElementById('menuCat');
  // Pre-order elements
  const poSearch=document.getElementById('poSearch');
  const poStatus=document.getElementById('poStatus');
  const poSheet =document.getElementById('poSheet');
  const poList  =document.getElementById('poList');
  const poPrev  =document.getElementById('poPrev');
  const poNext  =document.getElementById('poNext');
  const poTotal =document.getElementById('poTotal');
  const burgerPO =document.getElementById('burgerPO');
  const menuPO   =document.getElementById('menuPO');
  
  // ========= MENU =========
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
    const isInsideMenu = menuCat?.contains(e.target) || burgerCat?.contains(e.target) || menuPO?.contains(e.target) || burgerPO?.contains(e.target);
    if(!isInsideMenu) closeAllMenus();
  });

  function setMode(next){
    viewCatalog.style.display = next==='katalog' ? 'block' : 'none';
    viewPreorder.style.display= next==='preorder' ? 'block' : 'none';
    closeAllMenus();
    if(next==='preorder' && !poState.initialized) poInit();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  [...document.querySelectorAll('.menu-btn[data-mode]')]
    .forEach(btn=>btn.addEventListener('click',()=>setMode(btn.getAttribute('data-mode'))));

  // ========= UTILS =========
  const prettyLabel=(raw)=>String(raw||'').trim().replace(/\s+/g,' ');
  const toIDR=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v);
  const sheetUrlJSON=(sheetName)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  const sheetUrlCSV =(sheetIndex0)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet${sheetIndex0+1}`;

  // ========= KATALOG =========
  function parseGVizPairs(txt){
    const match = txt.match(/google\.visualization\.Query\.setResponse\((.*)\)/s);
    if (!match || !match[1]) throw new Error('Invalid GViz response.');
    const obj = JSON.parse(match[1]);
    const table=obj.table||{}, rows=table.rows||[], cols=table.cols||[];
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
    if(!customSelectWrapper.contains(e.target)) toggleCustomSelect(false);
  });

  function buildGameSelect(){
    CATS = [...new Map(DATA.map(it => [it.catKey, it.catLabel])).entries()]
           .map(([key, label]) => ({ key, label }));

    customSelectOptions.innerHTML='';
    CATS.forEach((c,idx)=>{
      const el=document.createElement('div');
      el.className='custom-select-option'; el.textContent=c.label; el.dataset.value=c.key; el.setAttribute('role','option');
      if(idx===0) el.classList.add('selected');
      el.addEventListener('click',()=>{
        activeCat=c.key; customSelectValue.textContent=c.label;
        customSelectOptions.querySelector('.selected')?.classList.remove('selected');
        el.classList.add('selected'); toggleCustomSelect(false); renderList();
      });
      customSelectOptions.appendChild(el);
    });

    if(CATS.length>0){ activeCat=CATS[0].key; customSelectValue.textContent=CATS[0].label; }
    else{ customSelectValue.textContent="Data tidak tersedia"; }
  }

  function renderList(){
    const queryLower = query.toLowerCase();
    const items=DATA.filter(x=>x.catKey===activeCat&&(query===''||x.title.toLowerCase().includes(queryLower)||String(x.price).includes(queryLower)));
    listEl.innerHTML='';
    if(items.length===0){ listEl.innerHTML=`<div class="empty">Tidak ada hasil ditemukan.</div>`; countInfoEl.textContent=''; return; }
    
    const frag=document.createDocumentFragment();
    for(const it of items){
      const clone=itemTmpl.content.cloneNode(true);
      const link=clone.querySelector('.list-item');
      link.querySelector('.title').textContent=it.title;
      link.querySelector('.price').textContent=toIDR(it.price);
      const text=`${WA_GREETING}\n› Tipe: Katalog\n› Game: ${it.catLabel}\n› Item: ${it.title}\n› Harga: ${toIDR(it.price)}`;
      link.href=`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
      frag.appendChild(clone);
    }
    listEl.appendChild(frag);
    countInfoEl.textContent=`${items.length} item ditemukan`;
  }

  let debounceTimer;
  searchEl.addEventListener('input',e=>{
    clearTimeout(debounceTimer);
    debounceTimer=setTimeout(()=>{ query=e.target.value.trim(); renderList(); }, 250);
  });

  async function loadCatalog(){
    try{
      errBox.style.display='none';
      listEl.innerHTML=`<div class="empty">Memuat katalog...</div>`;
      const res=await fetch(sheetUrlJSON(SHEETS.katalog.name),{cache:'no-store'});
      if(!res.ok) throw new Error(`Network response was not ok: ${res.statusText} (${res.status})`);
      const txt=await res.text();
      DATA=parseGVizPairs(txt);
      if(DATA.length===0) throw new Error('Data kosong atau format kolom tidak sesuai.');
      buildGameSelect(); renderList();
    }catch(err){
      console.error("Fetch Katalog failed:",err);
      errBox.style.display='block'; 
      errBox.textContent=`Gagal memuat data. Silakan coba muat ulang halaman. (${err.message})`;
    }
  }

  // ========= PRE-ORDER =========
  const poState={initialized:false,allData:[],currentPage:1,perPage: PO_ITEMS_PER_PAGE};

  const PRIVACY_KEYS=new Set(['id gift','gift id','gift','nomor','no','telepon','no telepon','no. telepon','nomor telepon','phone','hp','whatsapp','wa','no wa','no. wa']);
  const isPrivacyKey=(k)=>{ const s=String(k||'').trim().toLowerCase(); return PRIVACY_KEYS.has(s) || [...PRIVACY_KEYS].some(key=>s.includes(key)); };
  const scrubRecord=(rec)=>{ const out={}; for(const k in rec) if(!isPrivacyKey(k)) out[k]=rec[k]; return out; };

  const STATUS_MAP = new Map([
    [['success','selesai','berhasil','done'], 'success'],
    [['progress','proses','diproses','processing'], 'progress'],
    [['failed','gagal','dibatalkan','cancel','error'], 'failed']
  ]);
  const normalizeStatus = (raw) => {
    const s = String(raw || '').trim().toLowerCase();
    for (const [keys, value] of STATUS_MAP.entries()) {
      if (keys.includes(s)) return value;
    }
    return 'pending';
  };
  
  const poFilterData=()=>{ const q=poSearch.value.trim().toLowerCase(); const status=poStatus.value;
    return poState.allData.filter(item=>{
      const name=(item['Nickname']||'').toLowerCase();
      const idServer=(item['ID Server']||'').toLowerCase();
      const product=(item['Produk / Item']||item['Item']||'').toLowerCase();
      const match=name.includes(q)||idServer.includes(q)||product.includes(q);
      const s=normalizeStatus(item['Status']);
      return match&&(status==='all'||s===status);
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
    if(pageData.length===0){ poList.innerHTML=`<div class="empty-state"><p>Tidak Ada Hasil Ditemukan</p></div>`; poUpdatePagination(0,0); return; }

    const frag=document.createDocumentFragment();
    pageData.forEach(item=>{
      const clean=scrubRecord(item);
      const statusClass=normalizeStatus(clean['Status']);
      const name=clean['Nickname']||clean['ID Server']||'Tanpa Nama';
      const product=clean['Produk / Item']||clean['Item']||'N/A';
      const estDelivery=clean['Est. Pengiriman']?`${clean['Est. Pengiriman']} 20:00 WIB`:'';

      const HIDE=new Set(['Nickname','ID Server','Produk / Item','Item','Status','Est. Pengiriman']);
      const detailsHtml=Object.entries(clean).filter(([k,v])=>v&&!HIDE.has(k)).map(([k,v])=>`
        <div class="detail-item">
          <div class="detail-label">${k}</div>
          <div class="detail-value">${v}</div>
        </div>`).join('');

      const card=document.createElement('article');
      card.className=`card ${detailsHtml?'clickable':''}`;
      card.innerHTML=`
        <div class="card-header">
          <div>
            <div class="card-name">${name}</div>
            <div class="card-product">${product}</div>
          </div>
          <div class="status-badge ${statusClass}">${(clean['Status']||'Pending').toUpperCase()}</div>
        </div>
        ${estDelivery?`<div class="card-date">Estimasi Pengiriman: ${estDelivery}</div>`:''}
        ${detailsHtml?`<div class="card-details"><div class="details-grid">${detailsHtml}</div></div>`:''}`;
      if(detailsHtml) card.addEventListener('click',()=>card.classList.toggle('expanded'));
      frag.appendChild(card);
    });
    poList.appendChild(frag); poUpdatePagination(poState.currentPage,totalPages);
  };

  const poSortByStatus=(data)=>{ const order={'progress':1,'pending':2,'success':3,'failed':4};
    return data.sort((a,b)=>order[normalizeStatus(a.Status)]-order[normalizeStatus(b.Status)]);
  };

  async function poFetch(sheetIndex0){
    poList.innerHTML=`<div class="loading"><div class="spinner"></div><p>Memuat data...</p></div>`;
    poTotal.textContent='Memuat data...';
    try{
      const res=await fetch(sheetUrlCSV(sheetIndex0),{cache:'no-store'});
      if(!res.ok) throw new Error(`Network response was not ok: ${res.statusText}`);
      const text=await res.text();
      const rows=text.trim().split('\n').map(r=>r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,'').trim()));
      if(rows.length<1){ poState.allData=[]; return; }

      let mappedData;
      if(sheetIndex0===0){
        const headers=rows.shift();
        mappedData=rows.map(row=>Object.fromEntries(row.map((val,i)=>[headers[i]||`col_${i+1}`,val]))).filter(item=>item[headers[0]]);
      }else{
        const body=rows[0]?.length===3&&['id server','item','status'].includes(rows[0][0].toLowerCase())?rows.slice(1):rows;
        mappedData=body.map(r=>({'ID Server':r[0]||'','Item':r[1]||'','Status':r[2]||''})).filter(item=>item['ID Server']);
      }
       poState.allData = poSortByStatus(mappedData);
    }catch(e){
      poState.allData=[]; 
      poTotal.textContent='Gagal memuat data.'; 
      console.error('Fetch Pre-Order failed:',e);
    }finally{ 
      poState.currentPage=1; 
      poRender(); 
    }
  }

  function poInit(){
    if(poState.initialized) return;
    const rebound=()=>{ poState.currentPage=1; poRender(); };
    poSearch.addEventListener('input',rebound);
    poStatus.addEventListener('change',rebound);
    poSheet.addEventListener('change',e=>poFetch(parseInt(e.target.value,10)));
    poPrev.addEventListener('click',()=>{ if(poState.currentPage>1){ poState.currentPage--; poRender(); window.scrollTo({top:0,behavior:'smooth'});} });
    poNext.addEventListener('click',()=>{ poState.currentPage++; poRender(); window.scrollTo({top:0,behavior:'smooth'});} );
    poFetch(parseInt(poSheet.value,10) || 0);
    poState.initialized=true;
  }

  // ========= START =========
  loadCatalog();

  // ========= ANTI‑ZOOM =========
  window.addEventListener('gesturestart',e=>e.preventDefault());
  window.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)e.preventDefault()},{passive:false});
  window.addEventListener('keydown',e=>{const z=['Equal','NumpadAdd','Minus','NumpadSubtract','Digit0','Numpad0'];if((e.ctrlKey||e.metaKey)&&z.includes(e.code))e.preventDefault()});
  (function(){let t=0;document.addEventListener('touchend',e=>{const n=Date.now();if(n-t<=300)e.preventDefault();t=n},{passive:false})})();
})();
