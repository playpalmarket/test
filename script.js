(function(){
  // ========= CONFIG =========
  const SHEET_ID='1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
  const SHEETS={
    katalog:{name:'Sheet3'},
    preorder:{name1:'Sheet1',name2:'Sheet2'},
    film:{name:'Sheet4'} // Judul Film | Harga | Link | (optional Poster)
  };
  const WA_NUMBER='6285877001999';
  const WA_GREETING='*Detail pesanan:*';

  let DATA=[],CATS=[],activeCat='',query='';

  // ========= ELEMENTS =========
  const viewCatalog=document.getElementById('viewCatalog');
  const viewPreorder=document.getElementById('viewPreorder');
  const viewFilm   =document.getElementById('viewFilm');

  // Katalog
  const listEl=document.getElementById('list-container');
  const searchEl=document.getElementById('search');
  const countInfoEl=document.getElementById('countInfo');
  const itemTmpl=document.getElementById('itemTmpl');
  const errBox=document.getElementById('error');

  const customSelectWrapper=document.getElementById('custom-select-wrapper');
  const customSelectBtn=document.getElementById('custom-select-btn');
  const customSelectValue=document.getElementById('custom-select-value');
  const customSelectOptions=document.getElementById('custom-select-options');

  // burgers
  const burgerCat=document.getElementById('burgerCat');
  const burgerPO =document.getElementById('burgerPO');
  const burgerFilm=document.getElementById('burgerFilm');
  const menuCat  =document.getElementById('menuCat');
  const menuPO   =document.getElementById('menuPO');
  const menuFilm =document.getElementById('menuFilm');

  // ========= PRE‑ORDER =========
  const poSearch=document.getElementById('poSearch');
  const poStatus=document.getElementById('poStatus');
  const poSheet =document.getElementById('poSheet');
  const poList  =document.getElementById('poList');
  const poPrev  =document.getElementById('poPrev');
  const poNext  =document.getElementById('poNext');
  const poTotal =document.getElementById('poTotal');
  const poState={initialized:false,allData:[],currentPage:1,perPage:15};

  const PRIVACY_KEYS=['id gift','gift id','gift','nomor','no','telepon','no telepon','no. telepon','nomor telepon','phone','hp','whatsapp','wa','no wa','no. wa'];
  const isPrivacyKey=(k)=>{ const s=String(k||'').trim().toLowerCase(); return PRIVACY_KEYS.some(key=>s===key||s.includes(key)); };
  const scrubRecord=(rec)=>{ const out={...rec}; for(const k of Object.keys(out)) if(isPrivacyKey(k)) out[k]=''; return out; };

  // ========= FILM =========
  const filmMeta   = document.getElementById('filmMeta');
  const filmList   = document.getElementById('filmList');
  const filmTmpl   = document.getElementById('filmTmpl');
  const filmSelectWrap = document.getElementById('filmSelectWrap');
  const filmSelectBtn  = document.getElementById('filmSelectBtn');
  const filmSelectVal  = document.getElementById('filmSelectValue');
  const filmSelectOpts = document.getElementById('filmSelectOptions');
  const filmState = { initialized:false, data:[], selectedIndex:0 };

  // ========= MENU =========
  function setMode(next){
    const show = (el, on) => { if(el) el.style.display = on ? 'block':'none'; };
    [viewCatalog,viewPreorder,viewFilm].forEach(v=>{ if(v){ v.style.transition='opacity 200ms var(--curve)'; v.style.opacity=0; }});
    requestAnimationFrame(()=>{
      show(viewCatalog,  next==='katalog');
      show(viewPreorder, next==='preorder');
      show(viewFilm,     next==='film');
      [viewCatalog,viewPreorder,viewFilm].forEach(v=>{ if(v) v.style.opacity=1; });
    });
    if(next==='preorder' && !poState.initialized) poInit();
    if(next==='film'     && !filmState.initialized) filmInit();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  window.MenuAPI = window.MenuModule.init({
    burgerCat, burgerPO, burgerFilm,
    menuCat, menuPO, menuFilm,
    onRoute: setMode
  });

  // ========= UTILS =========
  const prettyLabel=(raw)=>String(raw||'').trim().replace(/\s+/g,' ');
  const toIDR=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v);
  const sheetUrlJSON=(sheetName)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  const sheetUrlCSV =(sheetIndex0)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet${sheetIndex0+1}`;

  function normalizeStatus(raw){
    const s=String(raw||'').trim().toLowerCase();
    if(['success','selesai','berhasil','done'].includes(s)) return 'success';
    if(['progress','proses','diproses','processing'].includes(s)) return 'progress';
    if(['failed','gagal','dibatalkan','cancel','error'].includes(s)) return 'failed';
    return 'pending';
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
  customSelectBtn?.addEventListener('click',()=>toggleCustomSelect());
  document.addEventListener('click',(e)=>{
    if(!customSelectWrapper?.contains(e.target) && !customSelectBtn?.contains(e.target)) toggleCustomSelect(false);
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
      link.href=`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
      frag.appendChild(clone);
    }
    listEl.appendChild(frag);
    countInfoEl.textContent=`${items.length} item ditemukan`;
  }

  let debounceTimer;
  searchEl?.addEventListener('input',e=>{
    clearTimeout(debounceTimer);
    debounceTimer=setTimeout(()=>{ query=e.target.value.trim().toLowerCase(); renderList(); },160);
  },{passive:true});

  async function loadCatalog(){
    try{
      errBox.style.display='none';
      listEl.innerHTML=`<div class="empty">Memuat katalog...</div>`;
      const res=await fetch(sheetUrlJSON(SHEETS.katalog.name),{cache:'no-store'});
      if(!res.ok) throw new Error(`Network response was not ok: ${res.statusText}`);
      const txt=await res.text();
      DATA=parseGVizPairs(txt);
      if(DATA.length===0) throw new Error('Data kosong atau format kolom tidak sesuai.');
      buildGameSelect(); renderList();
    }catch(err){
      console.error("Fetch Katalog failed:",err);
      errBox.style.display='block'; errBox.textContent=`Gagal memuat data: ${err.message}`;
    }
  }

  // ========= PRE‑ORDER =========
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
  const poSortByStatus=(data)=>{ const order={'progress':1,'pending':2,'success':3,'failed':4}; return data.sort((a,b)=>order[normalizeStatus(a.Status)]-order[normalizeStatus(b.Status)]); };

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
      const clean=scrubRecord(item);
      const statusClass=normalizeStatus(clean['Status']);
      const name=clean['Nickname']||clean['ID Server']||'Tanpa Nama';
      const product=clean['Produk / Item']||clean['Item']||'N/A';
      const estDelivery=clean['Est. Pengiriman']?`${clean['Est. Pengiriman']} 20:00 WIB`:''; // placeholder

      const HIDE=new Set(['Nickname','ID Server','Produk / Item','Item','Status','Est. Pengiriman',...Object.keys(clean).filter(isPrivacyKey)]);
      const detailsHtml=Object.entries(clean).filter(([k,v])=>v&&!HIDE.has(k)).map(([k,v])=>`
        <div class="detail-item"><div class="detail-label">${k}</div><div class="detail-value">${v}</div></div>`).join('');

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
        ${detailsHtml?`<div class="card-details"><div class="details-grid">${detailsHtml}</div></div>`:''}
      `;
      if(detailsHtml) card.addEventListener('click',()=>card.classList.toggle('expanded'),{passive:true});
      frag.appendChild(card);
    });
    poList.appendChild(frag); poUpdatePagination(poState.currentPage,totalPages);
  };

  async function poFetch(sheetIndex0){
    poTotal.textContent='Memuat data...';
    poList.innerHTML=`<div class="empty">Memuat data...</div>`;
    try{
      const res=await fetch(sheetUrlCSV(sheetIndex0),{cache:'no-store'});
      if(!res.ok) throw new Error(`Network response was not ok: ${res.statusText}`);
      const text=await res.text();
      const rows=text.trim().split('\n').map(r=>r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,'').trim()));
      if(rows.length<1){ poState.allData=[]; return; }

      if(sheetIndex0===0){
        const headers=rows.shift();
        const mapped=rows.map(row=>Object.fromEntries(row.map((val,i)=>[headers[i]||`col_${i+1}`,val]))).filter(item=>item[headers[0]]);
        poState.allData=poSortByStatus(mapped.map(scrubRecord));
      }else{
        // Sheet2 – skip baris data nomor 1 (mulai nomor 2)
        const body = rows[0]?.length===3 && ['id server','item','status'].includes(rows[0][0].toLowerCase())
          ? rows.slice(1) : rows;
        const trimmed = body.slice(1);
        const mapped = trimmed
          .map(r=>({'ID Server':r[0]||'','Item':r[1]||'','Status':r[2]||''}))
          .filter(item=>item['ID Server']);
        poState.allData = poSortByStatus(mapped.map(scrubRecord));
      }
    }catch(e){
      poState.allData=[]; poTotal.textContent='Gagal memuat data.'; console.error('Fetch Pre-Order failed:',e);
    }finally{ poState.currentPage=1; poRender(); }
  }

  function poInit(){
    const rebound=()=>{ poState.currentPage=1; poRender(); };
    poSearch?.addEventListener('input',rebound,{passive:true});
    poStatus?.addEventListener('change',rebound,{passive:true});
    poSheet ?.addEventListener('change',e=>poFetch(parseInt(e.target.value,10)),{passive:true});
    document.getElementById('poPrev')?.addEventListener('click',()=>{ if(poState.currentPage>1){ poState.currentPage--; poRender(); window.scrollTo({top:0,behavior:'smooth'});} });
    document.getElementById('poNext')?.addEventListener('click',()=>{ poState.currentPage++; poRender(); window.scrollTo({top:0,behavior:'smooth'});} );
    poFetch(parseInt(poSheet?.value||'0',10) || 0);
    poState.initialized=true;
  }

  // ========= FILM (Sheet4) =========
  function filmHeaderMap(headers){
    const map = {};
    headers.forEach((h,i)=>{
      const k = String(h||'').trim().toLowerCase();
      map[k]=i;
    });
    const idx = {
      title: map['judul film'] ?? map['judul'] ?? map['title'] ?? 0,
      price: map['harga'] ?? 1,
      link : map['link'] ?? 2,
      poster: map['poster'] ?? map['thumbnail'] ?? undefined
    };
    return idx;
  }

  function filmRenderList(){
    filmList.innerHTML = '';
    const frag = document.createDocumentFragment();
    filmState.data.forEach((it, idx)=>{
      const clone = filmTmpl.content.cloneNode(true);
      const a = clone.querySelector('.list-item');
      a.querySelector('.title').textContent = it.title;
      a.querySelector('.price').textContent = it.price || '';
      a.href = '#';
      a.addEventListener('click', (e)=>{
        e.preventDefault();
        handleFilmClick(it); // ← Integrasi Google Drive Player/Folder
      });
      a.addEventListener('mouseover', ()=>filmSelectSet(idx), {passive:true});
      frag.appendChild(clone);
    });
    filmList.appendChild(frag);
    filmList.style.display='flex';
    filmMeta.textContent = `${filmState.data.length} film tersedia`;
  }

  function filmSelectBuild(){
    filmSelectOpts.innerHTML='';
    filmState.data.forEach((it, idx)=>{
      const el=document.createElement('div');
      el.className='custom-select-option';
      el.textContent = it.title;
      el.dataset.value = String(idx);
      el.addEventListener('click', ()=>{
        filmSelectSet(idx);
        filmSelectWrap.classList.remove('open');
        filmSelectBtn.setAttribute('aria-expanded','false');
      });
      filmSelectOpts.appendChild(el);
    });
    filmSelectBtn.addEventListener('click', ()=>{
      const isOpen = filmSelectWrap.classList.toggle('open');
      filmSelectBtn.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', (e)=>{
      if(!filmSelectWrap.contains(e.target) && !filmSelectBtn.contains(e.target)){
        filmSelectWrap.classList.remove('open');
        filmSelectBtn.setAttribute('aria-expanded','false');
      }
    }, {passive:true});
    if(filmState.data.length>0) filmSelectSet(0);
  }

  function filmSelectSet(idx){
    filmState.selectedIndex = idx;
    const it = filmState.data[idx];
    filmSelectVal.textContent = it ? it.title : 'Pilih Film';
  }

  async function filmLoad(){
    filmMeta.textContent = '';
    filmList.innerHTML = `<div class="empty">Memuat daftar film...</div>`;
    try{
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEETS.film.name)}`;
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error(res.statusText);
      const text = await res.text();
      const rows = text.trim().split('\n').map(r=>r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,'').trim()));
      if(rows.length<2){ filmState.data=[]; filmRenderList(); return; }
      const headers = rows[0];
      const idx = filmHeaderMap(headers);
      const body = rows.slice(1);
      filmState.data = body.map(r => ({
        title : r[idx.title] || '',
        price : r[idx.price] || '',
        link  : r[idx.link]  || '',
        poster: idx.poster!=null ? (r[idx.poster] || '') : ''
      })).filter(x => x.title && x.link);
      filmSelectBuild();
      filmRenderList();
    }catch(e){
      filmList.innerHTML = `<div class="err">Gagal memuat film: ${e.message}</div>`;
    }
  }

  function filmInit(){
    filmLoad();
    filmState.initialized = true;
  }

  // ========= GOOGLE DRIVE PLAYER / FOLDER =========
  // 1) ISI API KEY kamu di sini (Google Cloud → enable Drive API v3, buat API key Browser):
  const DRIVE_API_KEY = 'PASTE_API_KEY_KAMU_DI_SINI';

  // Ambil elemen overlay
  const gdPlayer = document.getElementById('gdPlayer');
  const gdStage = document.getElementById('gdStage');
  const gdIframe = document.getElementById('gdIframe');
  const gdTitle = document.getElementById('gdTitle');
  const gdClose = document.getElementById('gdClose');
  const gdPlayerBackdrop = document.getElementById('gdPlayerBackdrop');

  const gdFolder = document.getElementById('gdFolder');
  const gdFolderStage = document.getElementById('gdFolderStage');
  const gdFolderTitle = document.getElementById('gdFolderTitle');
  const gdFolderList = document.getElementById('gdFolderList');
  const gdFolderClose = document.getElementById('gdFolderClose');
  const gdFolderBackdrop = document.getElementById('gdFolderBackdrop');

  function driveIdFromFile(url){
    const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return (m1 && m1[1]) || (m2 && m2[1]) || null;
  }
  function driveIdFromFolder(url){
    const m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }
  const isFolderLink = (url)=>/\/folders\//.test(url);

  function openDriveFile(title, fileId){
    gdTitle.textContent = title || 'Memuat…';
    gdIframe.src = `https://drive.google.com/file/d/${fileId}/preview`;
    gdPlayer.classList.add('open');

    const fsEl = gdStage;
    if (fsEl.requestFullscreen) fsEl.requestFullscreen().catch(()=>{});
    else if (fsEl.webkitRequestFullscreen) fsEl.webkitRequestFullscreen();
  }
  function closeDriveFile(){
    gdPlayer.classList.remove('open');
    gdIframe.src = '';
    if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  }

  async function openDriveFolder(title, folderId){
    gdFolderTitle.textContent = title || 'Pilih Episode';
    gdFolderList.innerHTML = '<li><span class="name">Memuat episode…</span></li>';
    gdFolder.classList.add('open');

    try{
      const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
      const fields = encodeURIComponent('files(id,name,mimeType,modifiedTime,size)');
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=name&key=${DRIVE_API_KEY}`;
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error(`Gagal memuat folder: ${res.statusText}`);
      const data = await res.json();

      const files = (data.files || []).filter(f => f.mimeType.startsWith('video/') || f.mimeType === 'application/vnd.google-apps.file');

      if(files.length === 0){
        gdFolderList.innerHTML = '<li><span class="name">Folder kosong / tidak ada video.</span></li>';
        return;
      }

      const fmt = (bytes)=> bytes ? `${(Number(bytes)/1e6).toFixed(1)} MB` : '';
      gdFolderList.innerHTML = '';
      files.forEach((f)=>{
        const li = document.createElement('li');
        li.innerHTML = `<span class="name">${f.name}</span><span class="meta">${(f.modifiedTime||'').slice(0,10)} ${fmt(f.size)}</span>`;
        li.addEventListener('click', ()=>{
          gdFolder.classList.remove('open');
          openDriveFile(f.name, f.id);
        }, {passive:true});
        gdFolderList.appendChild(li);
      });
    }catch(e){
      gdFolderList.innerHTML = `<li><span class="name">Gagal memuat folder. ${e.message}</span></li>`;
    }
  }
  function closeDriveFolder(){ gdFolder.classList.remove('open'); }

  gdClose?.addEventListener('click', closeDriveFile);
  gdPlayerBackdrop?.addEventListener('click', closeDriveFile);
  gdFolderClose?.addEventListener('click', closeDriveFolder);
  gdFolderBackdrop?.addEventListener('click', closeDriveFolder);
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Escape'){
      if(gdPlayer.classList.contains('open')) closeDriveFile();
      if(gdFolder.classList.contains('open')) closeDriveFolder();
    }
  });

  function handleFilmClick(item){
    const link = item.link || '';
    const title = item.title || 'Film';
    if (isFolderLink(link)){
      const folderId = driveIdFromFolder(link);
      if (folderId) openDriveFolder(title, folderId);
    } else {
      const fileId = driveIdFromFile(link);
      if (fileId) openDriveFile(title, fileId);
      else window.open(link, '_blank', 'noopener');
    }
  }

  // ========= START =========
  setMode('katalog');
  loadCatalog();
})();
