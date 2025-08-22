// script.js
(function(){
  // ========= CONFIG =========
  const SHEET_ID = '1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
  const SHEETS   = { katalog:{name:'Sheet3'} };
  const WA_NUMBER   = '6285877001999';
  const WA_GREETING = '*Detail pesanan:*';

  // ========= ELEMENTS =========
  const el = {
    viewCatalog: document.getElementById('viewCatalog'),
    viewPreorder: document.getElementById('viewPreorder'),

    list: document.getElementById('list-container'),
    search: document.getElementById('search'),
    countInfo: document.getElementById('countInfo'),
    itemTmpl: document.getElementById('itemTmpl'),
    err: document.getElementById('error'),

    // custom select (katalog)
    selWrap: document.getElementById('custom-select-wrapper'),
    selBtn: document.getElementById('custom-select-btn'),
    selValue: document.getElementById('custom-select-value'),
    selOptions: document.getElementById('custom-select-options'),

    // menus
    burgerCat: document.getElementById('burgerCat'),
    burgerPO:  document.getElementById('burgerPO'),
    menuCat:   document.getElementById('menuCat'),
    menuPO:    document.getElementById('menuPO'),

    // preorder
    poSearch: document.getElementById('poSearch'),
    poStatus: document.getElementById('poStatus'),
    poSheet:  document.getElementById('poSheet'),
    poList:   document.getElementById('poList'),
    poPrev:   document.getElementById('poPrev'),
    poNext:   document.getElementById('poNext'),
    poTotal:  document.getElementById('poTotal'),
  };

  // ========= STATE =========
  let DATA = [];            // katalog flattened
  let CATS = [];            // [{key,label}]
  let activeCat = '';
  let query = '';

  const poState = { initialized:false, allData:[], currentPage:1, perPage:15 };

  // ========= HELPERS =========
  const toIDR = v => new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0}).format(v);
  const sheetUrlJSON = sheetName => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  const sheetUrlCSV  = idx0 => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${idx0===0?'0':'691711508'}`;
  const debounce=(fn,ms=220)=>{let t;return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};

  // ========= MENU (Burger) =========
  function closeAllMenus(){
    [el.burgerCat, el.burgerPO].forEach(b=>b && b.classList.remove('active'));
    [el.menuCat, el.menuPO].forEach(m=>m && m.classList.remove('open'));
    [el.burgerCat, el.burgerPO].forEach(b=>b && b.setAttribute('aria-expanded','false'));
  }
  function toggleMenu(which){
    const btn  = which==='cat' ? el.burgerCat : el.burgerPO;
    const menu = which==='cat' ? el.menuCat   : el.menuPO;
    const isOpen = menu.classList.contains('open');
    closeAllMenus();
    if(!isOpen){
      btn?.classList.add('active');
      btn?.setAttribute('aria-expanded','true');
      menu?.classList.add('open');
    }
  }
  el.burgerCat?.addEventListener('click',()=>toggleMenu('cat'));
  el.burgerPO ?.addEventListener('click',()=>toggleMenu('po'));
  document.getElementById('closeMenuCat')?.addEventListener('click',closeAllMenus);
  document.getElementById('closeMenuPO') ?.addEventListener('click',closeAllMenus);
  document.addEventListener('click',(e)=>{
    const inside = (el.menuCat?.contains(e.target) || el.burgerCat?.contains(e.target) ||
                    el.menuPO ?.contains(e.target) || el.burgerPO ?.contains(e.target));
    if(!inside) closeAllMenus();
  });

  function setMode(next){
    if(next==='katalog'){
      el.viewCatalog.classList.add('active');
      el.viewPreorder.classList.remove('active');
    }else{
      el.viewPreorder.classList.add('active');
      el.viewCatalog.classList.remove('active');
      if(!poState.initialized) poInit();
    }
    closeAllMenus();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  [...(el.menuCat?.querySelectorAll('.menu-btn[data-mode]')||[]),
   ...(el.menuPO ?.querySelectorAll('.menu-btn[data-mode]')||[])]
  .forEach(btn=>btn.addEventListener('click',()=>setMode(btn.getAttribute('data-mode'))));

  // ========= KATALOG =========
  function parseGVizPairs(txt){
    const m = txt.match(/\{.*\}/s); if(!m) throw new Error('Invalid GViz response');
    const obj = JSON.parse(m[0]); const table=obj.table||{}, rows=table.rows||[], cols=table.cols||[];
    const pairs = Array.from({length:Math.floor(cols.length/2)},(_,i)=>({iTitle:i*2,iPrice:i*2+1,label:cols[i*2]?.label||''}))
      .filter(p=>p.label && cols[p.iPrice]);

    const out = [];
    for(const r of rows){
      const c = r.c || [];
      pairs.forEach(p=>{
        const title = c[p.iTitle]?.v ?? '';
        const price = c[p.iPrice]?.v ?? '';
        if(String(title).trim()!==''){
          out.push({
            catKey: p.label.trim().toLowerCase(),
            catLabel: p.label.trim(),
            title: String(title).trim(),
            price: Number(String(price).replace(/[^\d]/g,'')) || 0
          });
        }
      });
    }
    return out;
  }

  async function loadCatalog(){
    try{
      el.err.hidden=true;
      el.list.innerHTML = `<div class="loading"><div class="spinner"></div><p>Memuat data...</p></div>`;
      const res = await fetch(sheetUrlJSON(SHEETS.katalog.name),{cache:'no-store'});
      const txt = await res.text();
      DATA = parseGVizPairs(txt);

      // build categories (unique)
      const map = new Map();
      DATA.forEach(it=>{ if(!map.has(it.catKey)) map.set(it.catKey,it.catLabel); });
      CATS = [...map].map(([key,label])=>({key,label}));

      // render custom select options
      el.selOptions.innerHTML='';
      CATS.forEach((c,idx)=>{
        const opt = document.createElement('div');
        opt.className = 'custom-select-option';
        opt.textContent = c.label;
        opt.dataset.value = c.key;
        opt.setAttribute('role','option');
        if(idx===0) opt.classList.add('selected');
        opt.addEventListener('click',()=>{
          activeCat = c.key;
          el.selValue.textContent = c.label;
          el.selOptions.querySelector('.selected')?.classList.remove('selected');
          opt.classList.add('selected');
          toggleSelect(false);
          renderList();
        });
        el.selOptions.appendChild(opt);
      });

      if(CATS.length){
        activeCat = CATS[0].key;
        el.selValue.textContent = CATS[0].label;
      }else{
        el.selValue.textContent = 'Data tidak tersedia';
      }
      renderList();
    }catch(err){
      console.error('Fetch Katalog failed:',err);
      el.err.hidden=false;
      el.err.textContent = `Gagal memuat data: ${err.message}`;
      el.list.innerHTML = '';
      el.countInfo.textContent = '';
    }
  }

  function renderList(){
    const q = query.trim().toLowerCase();
    const items = DATA.filter(x=>{
      if(activeCat && x.catKey!==activeCat) return false;
      return q==='' || x.title.toLowerCase().includes(q) || String(x.price).includes(q);
    });

    el.list.innerHTML='';
    if(!items.length){
      el.list.innerHTML = `<div class="empty">Tidak ada hasil ditemukan.</div>`;
      el.countInfo.textContent = '';
      return;
    }

    const frag = document.createDocumentFragment();
    for(const it of items){
      const clone = el.itemTmpl.content.cloneNode(true);
      const link  = clone.querySelector('.list-item');
      clone.querySelector('.title').textContent = it.title;
      clone.querySelector('.price').textContent = toIDR(it.price);

      const msg = `${WA_GREETING}\n› Tipe: Katalog\n› Game: ${it.catLabel}\n› Item: ${it.title}\n› Harga: ${toIDR(it.price)}`;
      link.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
      link.target = '_blank'; link.rel='noopener';
      frag.appendChild(clone);
    }
    el.list.appendChild(frag);
    el.countInfo.textContent = `${items.length} item`;
  }

  // search
  let tSearch;
  el.search?.addEventListener('input', e=>{
    clearTimeout(tSearch);
    tSearch = setTimeout(()=>{ query = e.target.value || ''; renderList(); }, 220);
  });

  // custom select open/close
  function toggleSelect(force){
    const open = force===true ? true : force===false ? false : !el.selWrap.classList.contains('open');
    el.selWrap.classList.toggle('open', open);
    el.selBtn.setAttribute('aria-expanded', String(open));
  }
  el.selBtn?.addEventListener('click', ()=> toggleSelect());
  document.addEventListener('click',(e)=>{
    if(!el.selWrap.contains(e.target)) toggleSelect(false);
  });
  el.selBtn?.addEventListener('keydown', (e)=>{
    if(e.key==='Escape') toggleSelect(false);
  });

  // ========= PRE-ORDER =========
  const PRIVACY_KEYS=['id gift','gift id','gift','nomor','no','no.','no hp','hp','nohp','telp','telepon','nomor telepon','phone','whatsapp','wa','no wa','no. wa','wa.','whatsapp no'];
  const isPrivacyKey = k => {
    const s = String(k||'').trim().toLowerCase();
    return PRIVACY_KEYS.some(key=>s===key || s.includes(key));
  };
  const scrubRecord = rec => { const out={...rec}; for(const k of Object.keys(out)) if(isPrivacyKey(k)) out[k]=''; return out; };
  const normalizeStatus = raw => {
    const s = String(raw||'').trim().toLowerCase();
    if(['success','selesai','berhasil','done'].includes(s)) return 'success';
    if(['progress','proses','diproses','processing'].includes(s)) return 'progress';
    if(['failed','gagal','dibatalkan','cancel','error'].includes(s)) return 'failed';
    return 'pending';
  };
  const poSort = data => {
    const rank = s => ({success:1,progress:2,pending:3,failed:4}[normalizeStatus(s)]||9);
    return data.slice().sort((a,b)=>rank(a.Status)-rank(b.Status));
  };

  function poFilterData(){
    const q = el.poSearch?.value.trim().toLowerCase() || '';
    const st = el.poStatus?.value || 'all';
    return poState.allData.filter(item=>{
      const hit = [item['ID Server'],item['Item'],item['Status'],item['Nickname']].map(x=>String(x||'').toLowerCase()).join(' ').includes(q);
      const sOK = st==='all' || normalizeStatus(item['Status'])===st;
      return hit && sOK;
    });
  }

  function poUpdatePagination(curr,total){
    el.poPrev.disabled = curr<=1 || total===0;
    el.poNext.disabled = curr>=total || total===0;
    el.poTotal.textContent = total ? `Hal. ${curr}/${total}` : '0';
  }

  function poRender(){
    const filtered = poFilterData();
    const totalPages = Math.max(1, Math.ceil(filtered.length/poState.perPage));
    poState.currentPage = Math.min(Math.max(1, poState.currentPage), totalPages);
    const start = (poState.currentPage-1) * poState.perPage;
    const page = filtered.slice(start, start+poState.perPage);

    el.poList.innerHTML = '';
    if(page.length===0){
      el.poList.innerHTML = `<div class="empty"><p>Tidak Ada Hasil Ditemukan</p></div>`;
      poUpdatePagination(0,0);
      return;
    }

    const frag = document.createDocumentFragment();
    page.forEach(item=>{
      const clean = scrubRecord(item);
      const statusClass = normalizeStatus(clean['Status']);
      const name = clean['Nickname'] || clean['ID Server'] || 'Tanpa Nama';
      const product = clean['Produk / Item'] || clean['Item'] || 'N/A';
      const est = clean['Est. Pengiriman'] ? `${clean['Est. Pengiriman']} 20:00 WIB` : '';

      const HIDE = new Set(['Nickname','ID Server','Produk / Item','Item','Status','Est. Pengiriman', ...Object.keys(clean).filter(isPrivacyKey)]);
      const details = Object.entries(clean).filter(([k,v])=>v && !HIDE.has(k)).map(([k,v])=>`
        <div class="detail-item">
          <div class="detail-label">${k}</div>
          <div class="detail-value">${v}</div>
        </div>`).join('');

      const card = document.createElement('article');
      card.className = `card ${details?'clickable':''}`;
      card.innerHTML = `
        <div class="card-header">
          <div>
            <div class="card-name">${name}</div>
            <div class="card-product">${product}</div>
          </div>
          <div class="status-badge ${statusClass}">${(clean['Status']||'').toUpperCase()}</div>
        </div>
        ${est?`<div class="card-est">${est}</div>`:''}
        ${details?`<div class="card-details"><div class="details-grid">${details}</div></div>`:''}
      `;
      if(details) card.addEventListener('click',()=>card.classList.toggle('expanded'));
      frag.appendChild(card);
    });
    el.poList.appendChild(frag);
    poUpdatePagination(poState.currentPage, totalPages);
  }

  // === CSV loader
  async function poFetch(sheetIdx0){
    el.poTotal.textContent='Memuat data...';
    el.poList.innerHTML = `<div class="loading"><div class="spinner"></div><p>Memuat data...</p></div>`;
    try{
      const res = await fetch(sheetUrlCSV(sheetIdx0), {cache:'no-store'});
      if(!res.ok) throw new Error(res.statusText);
      const text = await res.text();
      const rows = text.trim().split('\n').map(r=>r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,'').trim()));

      if(!rows.length){ poState.allData=[]; return; }

      if(sheetIdx0===0){
        const headers = rows.shift();
        const mapped = rows.map(row => Object.fromEntries(row.map((val,i)=>[headers[i]||`col_${i+1}`,val]))).filter(item=>item[headers[0]]);
        poState.allData = poSort(mapped.map(scrubRecord));
      }else{
        // PERMINTAAN: Sheet2 baris pertama adalah JUDUL -> SELALU DI-SKIP
        const body = rows.slice(1).filter(r=>r.length && r.some(c=>c));
        const mapped = body.map(r=>({'ID Server':r[0]||'','Item':r[1]||'','Status':r[2]||''})).filter(item=>item['ID Server']);
        poState.allData = poSort(mapped.map(scrubRecord));
      }
    }catch(err){
      console.error('Pre-Order fetch failed:',err);
      poState.allData = [];
      el.poList.innerHTML = `<div class="empty"><p>Gagal memuat data.</p></div>`;
      el.poTotal.textContent = '0';
    }finally{
      poState.currentPage = 1;
      poRender();
    }
  }

  function poInit(){
    if(poState.initialized) return;
    poState.initialized = true;

    el.poSheet?.addEventListener('change',()=>{
      poState.currentPage=1;
      const idx = Number(el.poSheet.value||0);
      poFetch(idx);
    });
    el.poSearch?.addEventListener('input', debounce(()=>{ poState.currentPage=1; poRender(); }, 220));
    el.poStatus?.addEventListener('change', ()=>{ poState.currentPage=1; poRender(); });
    el.poPrev?.addEventListener('click', ()=>{ poState.currentPage=Math.max(1, poState.currentPage-1); poRender(); });
    el.poNext?.addEventListener('click', ()=>{ poState.currentPage=poState.currentPage+1; poRender(); });

    // initial load Sheet1
    poFetch( Number(el.poSheet?.value || 0) );
  }

  // ========= START =========
  loadCatalog();
})();
