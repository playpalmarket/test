/* ================== CONFIG ================== */
const CONFIG = {
  SHEET_ID: '1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw', // <== GANTI
  // Katalog: daftar kategori -> nama sheet/tab di Google Sheet
  CATEGORIES: [
    { id: 'SheetKatalog1', name: 'Free Fire Indonesia' },
    { id: 'SheetKatalog2', name: 'Mobile Legends' },
    { id: 'SheetKatalog3', name: 'PUBG Mobile' }
  ],
  // Pre-order: daftar sheet yang ingin ditampilkan
  PREORDER_SHEETS: [
    { id: 'Sheet2', name: 'Sheet2 (skip #1)' }, // instruksi: nomor 1 tidak ditampilkan
    { id: 'Sheet3', name: 'Sheet3' }
  ],
  // Film: nama sheet tab berisi daftar film (title | price/label | link)
  FILM_SHEET: 'SheetFilm'
};

/* ================== UTIL ================== */
function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }

function addRipple(el){
  if(!el) return;
  el.addEventListener('click', function(e){
    const rect = el.getBoundingClientRect();
    const d = Math.max(rect.width, rect.height);
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.width = r.style.height = d + 'px';
    r.style.left = (e.clientX - rect.left - d/2) + 'px';
    r.style.top  = (e.clientY - rect.top  - d/2) + 'px';
    el.appendChild(r);
    setTimeout(()=> r.remove(), 520);
  }, {passive:true});
}

/* gviz parser (out:json) */
async function fetchSheet(sheetName){
  const base = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(base, {cache:'no-store'});
  const text = await res.text();
  // gviz format: "/*O_o*/\ngoogle.visualization.Query.setResponse({...});"
  const json = JSON.parse(text.substring(47).slice(0,-2));
  const rows = json.table.rows.map(r => r.c.map(c => (c ? c.v : "")));
  const headers = json.table.cols.map(c => c.label || c.id || '');
  return { headers, rows };
}
function rowsToObjects({headers, rows}, startIndex=1){
  return rows.slice(startIndex).map(r=>{
    const obj={};
    headers.forEach((h,i)=> obj[h||`col${i}`] = r[i] ?? '');
    return obj;
  });
}

/* ================== ROUTER ================== */
const views = {
  katalog: qs('#viewCatalog'),
  preorder: qs('#viewPreorder'),
  film: qs('#viewFilm')
};
function setMode(mode){
  Object.entries(views).forEach(([k,el])=> el.style.display = (k===mode?'block':'none'));
  qsa('.tab-btn').forEach(b=> b.classList.toggle('active', b.dataset.mode===mode));
  window.scrollTo({top:0, behavior:'instant'});
}
window.setMode = setMode;

/* ================== KATALOG ================== */
const stateCatalog = {
  activeCat: null,
  data: [],
  filtered: []
};
const elCat = {
  wrap: qs('#custom-select-wrapper'),
  btn:  qs('#custom-select-btn'),
  val:  qs('#custom-select-value'),
  box:  qs('#custom-select-options'),
  search: qs('#search'),
  list: qs('#list-container'),
  count: qs('#countInfo'),
  tmpl: qs('#itemTmpl')
};

function catalogRenderDropdown(){
  elCat.box.innerHTML='';
  CONFIG.CATEGORIES.forEach((c,i)=>{
    const opt = document.createElement('div');
    opt.className = 'custom-select-option';
    opt.setAttribute('role','option');
    opt.dataset.id = c.id;
    opt.textContent = c.name;
    if(i===0) opt.classList.add('selected');
    elCat.box.appendChild(opt);
  });
  elCat.val.textContent = CONFIG.CATEGORIES[0]?.name || 'Pilih Kategori';
}
function catalogBindDropdown(){
  if(!elCat.wrap) return;
  const open = ()=>{ elCat.wrap.classList.add('open'); elCat.btn.setAttribute('aria-expanded','true'); };
  const close = ()=>{ elCat.wrap.classList.remove('open'); elCat.btn.setAttribute('aria-expanded','false'); };
  elCat.btn.addEventListener('click', (e)=>{ e.stopPropagation(); elCat.wrap.classList.toggle('open'); elCat.btn.setAttribute('aria-expanded', String(elCat.wrap.classList.contains('open'))); });
  document.addEventListener('click', close);
  window.addEventListener('scroll', close, {passive:true});
  elCat.box.addEventListener('click', (e)=>{
    const opt = e.target.closest('.custom-select-option'); if(!opt) return;
    qsa('.custom-select-option', elCat.box).forEach(o=>o.classList.remove('selected'));
    opt.classList.add('selected');
    const id = opt.dataset.id;
    const name = opt.textContent;
    elCat.val.textContent = name;
    close();
    catalogLoadSheet(id, name);
  });
}

function catalogRenderList(arr){
  const list = elCat.list;
  list.innerHTML = '';
  if(!arr.length){
    list.innerHTML = `<div class="empty">Tidak ada item.</div>`;
    elCat.count.textContent = '0 item';
    return;
  }
  const frag = document.createDocumentFragment();
  arr.forEach(it=>{
    const clone = elCat.tmpl.content.cloneNode(true);
    const a = clone.querySelector('a.list-item');
    a.href = it.link || '#';
    a.target = '_blank';
    a.querySelector('.title').textContent = it.title || it.nama || it.product || '';
    a.querySelector('.subtitle').textContent = it.subtitle || it.kategori || '';
    a.querySelector('.price').textContent = it.price || it.harga || '';
    frag.appendChild(clone);
  });
  list.appendChild(frag);
  elCat.count.textContent = `${arr.length} item`;
}

function catalogApplySearch(){
  const q = (elCat.search.value || '').toLowerCase().trim();
  if(!q){ stateCatalog.filtered = stateCatalog.data.slice(); catalogRenderList(stateCatalog.filtered); return; }
  stateCatalog.filtered = stateCatalog.data.filter(it=>{
    const s = `${it.title||it.nama||''} ${it.subtitle||it.kategori||''} ${it.price||it.harga||''}`.toLowerCase();
    return s.includes(q);
  });
  catalogRenderList(stateCatalog.filtered);
}

async function catalogLoadSheet(sheetId, sheetName){
  elCat.list.innerHTML = `<div class="empty">Memuat ${sheetName}…</div>`;
  try{
    const {headers, rows} = await fetchSheet(sheetId);
    const objs = rowsToObjects({headers, rows}, 1).map(o=>{
      // Normalisasi beberapa kolom umum
      return {
        title: o['Judul']||o['Title']||o['Item']||o['Nama']||o['Product']||o['col0'],
        price: o['Harga']||o['Price']||o['col1'],
        link:  o['Link']||o['URL']||o['col2'],
        subtitle: o['Kategori']||o['Category']||''
      };
    });
    stateCatalog.activeCat = sheetId;
    stateCatalog.data = objs;
    stateCatalog.filtered = objs.slice();
    catalogRenderList(stateCatalog.filtered);
  }catch(e){
    elCat.list.innerHTML = `<div class="err">Gagal memuat: ${e}</div>`;
  }
}

/* ================== PRE‑ORDER ================== */
const statePO = {
  items: [],
  page: 0,
  pageSize: 10,
  filtered: []
};
const elPO = {
  select: qs('#poSheet'),
  search: qs('#poSearch'),
  status: qs('#poStatus'),
  total: qs('#poTotal'),
  list: qs('#poList'),
  prev: qs('#poPrev'),
  next: qs('#poNext')
};

function poFillSheetSelect(){
  elPO.select.innerHTML = CONFIG.PREORDER_SHEETS.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
}
function poRenderPage(){
  const start = statePO.page * statePO.pageSize;
  const rows = statePO.filtered.slice(start, start + statePO.pageSize);
  elPO.list.innerHTML = '';
  if(!rows.length){
    elPO.list.innerHTML = `<div class="empty">Tidak ada data.</div>`;
  }else{
    const frag = document.createDocumentFragment();
    rows.forEach(it=>{
      const card = document.createElement('article');
      card.className = 'card clickable';
      card.innerHTML = `
        <div class="card-header">
          <div>
            <div class="card-name">${it.nama||it.name||it['Nama']||''}</div>
            <div class="card-product">${it.item||it.product||it['Item']||''}</div>
          </div>
          <div><span class="status-badge ${it.statusClass}">${it.statusLabel}</span></div>
          <div class="card-date">${it.tanggal||it.date||''}</div>
        </div>
        <div class="card-details">
          <div class="details-grid">
            <div><div class="detail-label">ID/Server</div><div class="detail-value">${it.idserver||it['ID Server']||''}</div></div>
            <div><div class="detail-label">Harga</div><div class="detail-value">${it.harga||it.price||''}</div></div>
            <div><div class="detail-label">Catatan</div><div class="detail-value">${it.catatan||it['Note']||''}</div></div>
          </div>
        </div>
      `;
      card.addEventListener('click', ()=>{
        card.classList.toggle('expanded');
      }, {passive:true});
      frag.appendChild(card);
    });
    elPO.list.appendChild(frag);
  }
  elPO.total.textContent = `${statePO.filtered.length} entri`;
  elPO.prev.disabled = statePO.page===0;
  elPO.next.disabled = (start + rows.length) >= statePO.filtered.length;
}

function poApplyFilter(){
  const q = (elPO.search.value||'').toLowerCase().trim();
  const st = elPO.status.value;
  statePO.filtered = statePO.items.filter(it=>{
    const statusOk = (st==='all') || (it.status===st);
    if(!statusOk) return false;
    if(!q) return true;
    const blob = `${it.nama||''} ${it.item||''} ${it.idserver||''}`.toLowerCase();
    return blob.includes(q);
  });
  statePO.page = 0;
  poRenderPage();
}
function poNormalizeStatus(raw=''){
  const s = String(raw).toLowerCase();
  if(s.includes('success')||s.includes('done')||s.includes('selesai')) return {status:'success', class:'success', label:'SUCCESS'};
  if(s.includes('progress')||s.includes('proses')||s.includes('ongoing')) return {status:'progress', class:'progress', label:'PROGRESS'};
  if(s.includes('pending')||s.includes('menunggu')) return {status:'pending', class:'pending', label:'PENDING'};
  if(s.includes('fail')||s.includes('gagal')||s.includes('cancel')) return {status:'failed', class:'failed', label:'FAILED'};
  return {status:'pending', class:'pending', label:'PENDING'};
}

async function poLoad(sheetId){
  elPO.list.innerHTML = `<div class="empty">Memuat ${sheetId}…</div>`;
  try{
    const {headers, rows} = await fetchSheet(sheetId);
    // Skip baris pertama (nomor 1) khusus Sheet2, sesuai permintaan.
    const skipFirst = sheetId.toLowerCase()==='sheet2';
    const objsRaw = rowsToObjects({headers, rows}, skipFirst ? 2 : 1);
    const objs = objsRaw.map(o=>{
      const st = poNormalizeStatus(o['Status']||o['status']||o['Keadaan']||'');
      return {
        nama: o['Nama']||o['Nama Player']||o['Name']||'',
        item: o['Item']||o['Produk']||o['Product']||'',
        idserver: o['ID Server']||o['ID']||'',
        harga: o['Harga']||o['Price']||'',
        tanggal: o['Tanggal']||o['Date']||'',
        status: st.status, statusClass:st.class, statusLabel:st.label,
        catatan: o['Catatan']||o['Note']||''
      };
    });
    statePO.items = objs;
    poApplyFilter();
  }catch(e){
    elPO.list.innerHTML = `<div class="err">Gagal memuat: ${e}</div>`;
  }
}

/* ================== FILM ================== */
const elFilm = {
  wrap: qs('#filmSelectWrap'),
  btn:  qs('#filmSelectBtn'),
  val:  qs('#filmSelectValue'),
  box:  qs('#filmSelectOptions'),
  list: qs('#filmList'),
  meta: qs('#filmMeta'),
  tmpl: qs('#filmTmpl')
};
const stateFilm = { data: [] };

function driveFileId(url){
  const m1 = String(url||'').match(/\/file\/d\/([A-Za-z0-9_-]+)/);
  const m2 = String(url||'').match(/[?&]id=([A-Za-z0-9_-]+)/);
  return (m1 && m1[1]) || (m2 && m2[1]) || null;
}
function driveDirectCandidates(fileUrlOrId){
  const id = /^[A-Za-z0-9_-]+$/.test(fileUrlOrId) ? fileUrlOrId : driveFileId(fileUrlOrId);
  if(!id) return [];
  return [
    `https://drive.google.com/uc?export=download&id=${id}`,
    `https://drive.google.com/uc?export=download&id=${id}&mime=video/mp4`,
    `https://drive.google.com/uc?export=download&id=${id}&confirm=t`
  ];
}

const vidModal = qs('#vidModal');
const vidBackdrop = qs('#vidBackdrop');
const vidClose = qs('#vidClose');
const vidTitle = qs('#vidTitle');
const vidEl = qs('#vidEl');

function clearVideo(){
  try{ vidEl.pause(); }catch{}
  vidEl.removeAttribute('src');
  vidEl.innerHTML = '';
  vidEl.load();
}
function openNativeVideo(title, fileUrlOrId){
  const candidates = driveDirectCandidates(fileUrlOrId);
  vidTitle.textContent = title || 'Memutar video';
  clearVideo();
  vidModal.classList.add('open');

  let idx = 0;
  const tryNext = ()=>{
    if(idx >= candidates.length){
      const id = driveFileId(fileUrlOrId);
      const openDrive = id ? `https://drive.google.com/file/d/${id}/preview` : (fileUrlOrId || '#');
      vidEl.poster = '';
      vidEl.controls = true;
      const old = qs('#videoFallback'); if(old) old.remove();
      vidEl.insertAdjacentHTML('afterend',
        `<div id="videoFallback" style="padding:12px 16px">
           <div style="font-weight:700;margin-bottom:8px">Video gagal dimuat.</div>
           <a href="${openDrive}" target="_blank" rel="noopener" class="list-item" style="display:inline-flex">Buka di Google Drive</a>
         </div>`);
      return;
    }
    const url = candidates[idx++];
    vidEl.innerHTML = `<source src="${url}" type="video/mp4">`;
    vidEl.load();
    const p = vidEl.play();
    if(p && typeof p.then==='function'){ p.catch(()=>{}); }

    const onErr = ()=>{
      vidEl.removeEventListener('error', onErr);
      clearVideo();
      tryNext();
    };
    vidEl.addEventListener('error', onErr, {once:true});
  };
  tryNext();
}
function closeNativeVideo(){
  qs('#videoFallback')?.remove();
  clearVideo();
  vidModal.classList.remove('open');
}
vidClose?.addEventListener('click', closeNativeVideo);
vidBackdrop?.addEventListener('click', closeNativeVideo);
document.addEventListener('keydown',(e)=>{ if(e.key==='Escape' && vidModal.classList.contains('open')) closeNativeVideo(); });

function filmRenderList(){
  elFilm.list.innerHTML = '';
  if(!stateFilm.data.length){
    elFilm.list.style.display='none';
    elFilm.meta.textContent = 'Tidak ada film';
    return;
  }
  const frag = document.createDocumentFragment();
  stateFilm.data.forEach((it, idx)=>{
    const clone = elFilm.tmpl.content.cloneNode(true);
    const a = clone.querySelector('.list-item');
    a.querySelector('.title').textContent = it.title || '';
    a.querySelector('.subtitle').textContent = it.note || '';
    a.querySelector('.price').textContent = it.label || '';
    a.href = '#';
    a.dataset.index = String(idx);
    frag.appendChild(clone);
  });
  elFilm.list.appendChild(frag);
  elFilm.list.style.display='flex';
  elFilm.meta.textContent = `${stateFilm.data.length} film tersedia`;
}
// Delegasi klik
qs('#filmList')?.addEventListener('click', (e)=>{
  const a = e.target.closest('.list-item'); if(!a) return;
  e.preventDefault();
  const idx = Number(a.dataset.index || -1);
  const it = stateFilm.data[idx];
  if(!it) return;
  const link = it.link || '';
  if(/\/file\/d\//.test(link) || /[?&]id=/.test(link)){
    openNativeVideo(it.title || 'Film', link);
  }else if(/\/folders\//.test(link)){
    const folderId = (link.match(/\/folders\/([A-Za-z0-9_-]+)/)||[])[1];
    if(folderId){
      // Tanpa API key kita arahkan ke preview folder
      window.open(`https://drive.google.com/drive/folders/${folderId}`, '_blank', 'noopener');
    }
  }else{
    window.open(link, '_blank', 'noopener');
  }
}, {passive:false});

function filmBindDropdown(){
  const wrap = elFilm.wrap, btn=elFilm.btn, val=elFilm.val, box=elFilm.box;
  if(!wrap||!btn||!val||!box) return;

  const open = ()=>{ wrap.classList.add('open'); btn.setAttribute('aria-expanded','true'); };
  const close = ()=>{ wrap.classList.remove('open'); btn.setAttribute('aria-expanded','false'); };
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); wrap.classList.toggle('open'); btn.setAttribute('aria-expanded', String(wrap.classList.contains('open'))); });
  document.addEventListener('click', close);
  window.addEventListener('scroll', close, {passive:true});

  // Opsi diisi saat loadSheetFilm (judul film)
}

/* ================== BINDING GLOBAL (BURGER, TABS, SEARCH) ================== */
function bindBurger(bid, mid){
  const btn = qs('#'+bid);
  const menu = qs('#'+mid);
  if(!btn||!menu) return;
  const icon = btn.querySelector('.material-symbols-rounded');
  const close = ()=>{ menu.classList.remove('open'); btn.setAttribute('aria-expanded','false'); if(icon) icon.textContent='menu'; };
  const open  = ()=>{ menu.classList.add('open');  btn.setAttribute('aria-expanded','true');  if(icon) icon.textContent='close'; };
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); menu.classList.contains('open') ? close() : open(); });
  document.addEventListener('click', (e)=>{ if(!menu.contains(e.target) && !btn.contains(e.target)) close(); });
  menu.addEventListener('click', (e)=>{ const b=e.target.closest('.menu-btn'); if(!b) return; const m=b.dataset.mode; if(m) setMode(m); close(); });
}

function bindTabs(){
  qsa('.tab-btn').forEach(b=>{
    addRipple(b);
    b.addEventListener('click', ()=> setMode(b.dataset.mode), {passive:true});
  });
}

function bindSearch(){
  if(elCat.search){
    elCat.search.addEventListener('input', catalogApplySearch, {passive:true});
  }
}

function attachRipples(){
  qsa('.menu-btn, .icon-btn, .list-item, .pagination-btn, .custom-select-btn').forEach(addRipple);
}

/* ================== LOADERS ================== */
async function initCatalog(){
  catalogRenderDropdown();
  catalogBindDropdown();
  // load kategori pertama
  const first = CONFIG.CATEGORIES[0];
  if(first) await catalogLoadSheet(first.id, first.name);
}
async function initPreorder(){
  poFillSheetSelect();
  elPO.select.addEventListener('change', ()=> poLoad(elPO.select.value), {passive:true});
  elPO.search.addEventListener('input', poApplyFilter, {passive:true});
  elPO.status.addEventListener('change', poApplyFilter, {passive:true});
  elPO.prev.addEventListener('click', ()=>{ if(statePO.page>0){ statePO.page--; poRenderPage(); }});
  elPO.next.addEventListener('click', ()=>{ statePO.page++; poRenderPage(); });
  // load sheet pertama
  if(CONFIG.PREORDER_SHEETS[0]) await poLoad(CONFIG.PREORDER_SHEETS[0].id);
}
async function initFilm(){
  filmBindDropdown();
  // Load film list dari sheet
  try{
    const {headers, rows} = await fetchSheet(CONFIG.FILM_SHEET);
    const objs = rowsToObjects({headers, rows}, 1).map(o=>({
      title: o['Judul']||o['Title']||o['Film']||o['col0'],
      label: o['Label']||o['Keterangan']||o['col1'],
      link:  o['Link']||o['URL']||o['col2'],
      note:  o['Catatan']||''
    })).filter(x=>x.title||x.link);
    stateFilm.data = objs;
    // isi dropdown judul
    const box = elFilm.box; const val = elFilm.val; box.innerHTML='';
    objs.forEach((f,i)=>{
      const opt = document.createElement('div');
      opt.className='custom-select-option'; opt.setAttribute('role','option'); opt.dataset.index=String(i);
      opt.textContent=f.title;
      if(i===0) opt.classList.add('selected');
      box.appendChild(opt);
    });
    val.textContent = objs[0]?.title || 'Pilih Film';
    // pilih film -> scroll ke list & buka modal langsung
    box.addEventListener('click', (e)=>{
      const opt = e.target.closest('.custom-select-option'); if(!opt) return;
      qsa('.custom-select-option', box).forEach(o=>o.classList.remove('selected'));
      opt.classList.add('selected');
      const idx = Number(opt.dataset.index);
      val.textContent = objs[idx]?.title || 'Pilih Film';
      elFilm.wrap.classList.remove('open');
      // buka player langsung
      const it = objs[idx];
      if(/\/file\/d\//.test(it.link)||/[?&]id=/.test(it.link)){ openNativeVideo(it.title, it.link); }
    }, {passive:false});
    filmRenderList();
  }catch(e){
    elFilm.meta.textContent = `Gagal memuat film: ${e}`;
  }
}

/* ================== INIT ================== */
document.addEventListener('DOMContentLoaded', async ()=>{
  attachRipples();
  bindTabs();
  bindBurger('burgerCat','menuCat');
  bindBurger('burgerPO','menuPO');
  bindBurger('burgerFilm','menuFilm');
  bindSearch();

  // init views
  await initCatalog();
  await initPreorder();
  await initFilm();

  // default mode
  setMode('katalog');
});
