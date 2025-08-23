/* =========================================================================
   PLAYPAL.ID — Frontend (Google x Apple: elegan, presisi, full fitur)
   - Data real Google Sheets via GViz (tanpa API key)
   - Tabs (Katalog/Pre-Order/Film), Search (debounce), Filter, Sort
   - Loader, Toast, Total, Pagination (Load more), Refresh
   - A11y & fokus ring
   ========================================================================= */

const CONFIG = {
  SHEET_ID: "1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw",  // <- ganti jika perlu
  DEFAULT_SHEET: "Sheet1",
  PAGE_SIZE: 30,
  COLUMN_ALIASES: {
    name:  ["nama","name","buyer","user","id","id server"],
    item:  ["item","produk","product","paket","order","deskripsi"],
    status:["status","state","progress"]
  },
  STATUS_MAP: {
    "SUCCESS":"success","DONE":"success","SELESAI":"success",
    "PROGRESS":"progress","PROCESS":"progress","ON PROGRESS":"progress",
    "PENDING":"pending","WAITING":"pending",
    "FAILED":"failed","CANCEL":"failed"
  },
  STORAGE: {
    sheet:"pp_sheet", section:"pp_section", query:"pp_query", status:"pp_status", sort:"pp_sort"
  }
};

// Shortcuts
const $ = sel => document.querySelector(sel);
const els = {
  burgerBtn: $("#burgerBtn"),
  dropdown: $("#dropdown"),
  refreshBtn: $("#refreshBtn"),
  tabs: Array.from(document.querySelectorAll(".tabbar .tab")),
  sheetSelect: $("#sheetSelect"),
  searchInput: $("#searchInput"),
  statusFilter: $("#statusFilter"),
  sortSelect: $("#sortSelect"),
  totalInfo: $("#totalInfo"),
  loadMoreBtn: $("#loadMoreBtn"),
  loader: $("#loader"),
  toast: $("#toast"),
  sections: {
    katalog: $("#katalog"),
    preorder: $("#preorder"),
    film: $("#film"),
  },
  lists: {
    katalog: $("#listKatalog"),
    preorder: $("#listPreorder"),
    film: $("#listFilm"),
  }
};

let currentSection = "katalog";
let cache = {};      // { sheetName: rows[] }
let headerMap = {};  // { sheetName: {name:idx,item:idx,status:idx} }
let filteredRows = [];
let shownCount = 0;

/* ===================== BASIC UI ===================== */
els.burgerBtn.addEventListener("click", () => els.dropdown.classList.toggle("hidden"));
document.addEventListener("click", (e)=>{
  if (!els.dropdown.contains(e.target) && e.target !== els.burgerBtn) els.dropdown.classList.add("hidden");
});
els.dropdown.addEventListener("click", (e)=>{
  const btn = e.target.closest(".dropdown-item");
  if (!btn) return;
  if (btn.dataset.action === "refresh") { hardRefresh(); return; }
  const id = (btn.dataset.target || "").replace("#","");
  showSection(id);
  els.dropdown.classList.add("hidden");
});

// Tabs
els.tabs.forEach(t => t.addEventListener("click", () => showSection(t.dataset.section)));
function syncTabs(){
  els.tabs.forEach(t=>{
    const active = t.dataset.section === currentSection;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", active ? "true" : "false");
  });
}

// Controls
els.refreshBtn.addEventListener("click", hardRefresh);

els.sheetSelect.addEventListener("change", async ()=>{
  localStorage.setItem(CONFIG.STORAGE.sheet, els.sheetSelect.value);
  await ensureSheetLoaded(els.sheetSelect.value, true);
  applyAndRender();
  toast(`Sheet: ${els.sheetSelect.value}`);
});

const debouncedSearch = debounce(()=>{ 
  localStorage.setItem(CONFIG.STORAGE.query, els.searchInput.value || "");
  applyAndRender();
}, 150);
els.searchInput.addEventListener("input", debouncedSearch);

els.statusFilter.addEventListener("change", ()=>{
  localStorage.setItem(CONFIG.STORAGE.status, els.statusFilter.value || "");
  applyAndRender();
});

els.sortSelect.addEventListener("change", ()=>{
  localStorage.setItem(CONFIG.STORAGE.sort, els.sortSelect.value || "name-asc");
  applyAndRender();
});

els.loadMoreBtn.addEventListener("click", renderChunk);

/* ===================== SECTIONS ===================== */
function showSection(id){
  if (!els.sections[id]) return;
  currentSection = id;
  localStorage.setItem(CONFIG.STORAGE.section, id);
  Object.keys(els.sections).forEach(k => els.sections[k].classList.toggle("is-active", k === id));
  syncTabs();
  applyAndRender();
}

/* ===================== GVIZ HELPERS ===================== */
function gvizUrl(sheet){
  const base = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq`;
  const p = new URLSearchParams({ tqx: "out:json", sheet });
  return `${base}?${p.toString()}`;
}

async function fetchSheetRows(sheet){
  const res = await fetch(gvizUrl(sheet), { cache: "no-store" });
  const text = await res.text();
  const json = JSON.parse(text.replace(/^[\s\S]*setResponse\(/,"").replace(/\);\s*$/,""));
  const cols = json.table.cols.map(c => (c.label || "").trim());
  const rows = json.table.rows.map(r => (r.c || []).map(cell => normalizeCell(cell)));
  const lc = cols.map(c => c.toLowerCase());

  headerMap[sheet] = {
    name: findHeaderIndex(lc, CONFIG.COLUMN_ALIASES.name),
    item: findHeaderIndex(lc, CONFIG.COLUMN_ALIASES.item),
    status: findHeaderIndex(lc, CONFIG.COLUMN_ALIASES.status)
  };
  return rows.slice(1); // header row
}

function normalizeCell(cell){
  if (!cell || cell.v === null) return "";
  // prefer formatted value (cell.f) jika ada
  if (cell.f && typeof cell.f === "string") return cell.f;
  // Date object
  if (cell.v instanceof Date) return formatDate(cell.v);
  // "Date(YYYY,MM,DD)"
  if (typeof cell.v === "string" && /^Date\(\d+,\d+,\d+\)/.test(cell.v)) {
    const [y,m,d] = cell.v.match(/\d+/g).map(Number);
    return formatDate(new Date(y, m-1, d));
  }
  return String(cell.v);
}
function formatDate(d){
  return d.toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" });
}
function findHeaderIndex(lowercaseCols, aliases){
  for (const a of aliases){
    const i = lowercaseCols.indexOf(a);
    if (i !== -1) return i;
  }
  return Math.min(0, lowercaseCols.length-1);
}

async function ensureSheetLoaded(sheet, force=false){
  if (!force && cache[sheet]) return;
  try{
    showLoader(true);
    cache[sheet] = await fetchSheetRows(sheet);
  }catch(e){
    console.error(e);
    cache[sheet] = [];
    toast("Gagal memuat data. Pastikan izin sheet publik (viewer).");
  }finally{
    showLoader(false);
  }
}

function hardRefresh(){
  const s = els.sheetSelect.value;
  cache[s] = null;
  ensureSheetLoaded(s, true).then(()=> applyAndRender());
  toast("Data diperbarui");
}

/* ===================== APPLY & RENDER ===================== */
function applyFilters(rows){
  const sheet = els.sheetSelect.value || CONFIG.DEFAULT_SHEET;
  const map = headerMap[sheet] || {name:0,item:1,status:2};

  const q = (els.searchInput.value || "").trim().toLowerCase();
  const fStatus = (els.statusFilter.value || "").trim().toUpperCase();
  const sort = (els.sortSelect.value || "name-asc");

  let list = rows.filter(r=>{
    const name = String(r[map.name] ?? "");
    const item = String(r[map.item] ?? "");
    const statusRaw = String(r[map.status] ?? "");

    const hay = `${name} ${item} ${statusRaw}`.toLowerCase();
    const okQuery = q ? hay.includes(q) : true;

    const badge = statusToClass(statusRaw);
    const okStatus = fStatus ? (badge && badge.toUpperCase() === fStatus) : true;

    return okQuery && okStatus;
  });

  // sort
  const byName = (a,b) => {
    const map = headerMap[sheet];
    const av=(a[map.name]||"").toString().toLowerCase();
    const bv=(b[map.name]||"").toString().toLowerCase();
    return av.localeCompare(bv, "id");
  };
  const statusOrder = ["SUCCESS","PROGRESS","PENDING","FAILED"];
  const byStatus = (a,b) => {
    const map = headerMap[sheet];
    const as = statusToClass(a[map.status]||"").toUpperCase();
    const bs = statusToClass(b[map.status]||"").toUpperCase();
    return statusOrder.indexOf(as) - statusOrder.indexOf(bs);
  };

  if (sort === "name-asc") list.sort(byName);
  else if (sort === "name-desc") list.sort((a,b)=>-byName(a,b));
  else if (sort === "status") list.sort(byStatus);

  return list;
}

function applyAndRender(){
  const s = els.sheetSelect.value || CONFIG.DEFAULT_SHEET;
  const rows = cache[s] || [];

  filteredRows = applyFilters(rows);
  els.totalInfo.textContent = `${filteredRows.length} total pesanan`;

  shownCount = 0;
  getActiveList().innerHTML = "";
  renderChunk();
}

function renderChunk(){
  const listEl = getActiveList();
  const sheet = els.sheetSelect.value || CONFIG.DEFAULT_SHEET;
  const map = headerMap[sheet] || {name:0,item:1,status:2};

  const next = filteredRows.slice(shownCount, shownCount + CONFIG.PAGE_SIZE);
  for (const r of next){
    // tampilkan hanya sekali bila name==item (hindari duplikasi visual)
    const title = safe(r[map.name]);
    const subRaw = safe(r[map.item]);
    const sub = (subRaw && subRaw !== title) ? subRaw : "";
    const badge = statusToClass(r[map.status]);
    listEl.appendChild(cardEl(title || "-", sub, badge));
  }
  shownCount += next.length;

  if (filteredRows.length === 0){
    listEl.innerHTML = "";
    listEl.appendChild(emptyState());
  }

  toggleLoadMore(shownCount < filteredRows.length);
}

function toggleLoadMore(show){
  els.loadMoreBtn.classList.toggle("hidden", !show);
}

function getActiveList(){
  return currentSection === "katalog" ? els.lists.katalog :
         currentSection === "preorder" ? els.lists.preorder :
         els.lists.film;
}

/* ===================== DOM BUILDERS ===================== */
function cardEl(title, sub, badgeClass){
  const d = document.createElement("article");
  d.className = "card"; d.setAttribute("role","listitem");
  d.innerHTML = `
    <div class="item-left">
      <h3 class="item-title">${escapeHtml(title)}</h3>
      ${sub ? `<p class="item-sub">${escapeHtml(sub)}</p>` : ``}
    </div>
    <div class="item-right">
      <span class="badge ${badgeClass.toLowerCase()}">${(badgeClass||"").toUpperCase()}</span>
    </div>
  `;
  return d;
}

function emptyState(){
  const d = document.createElement("div");
  d.className = "card";
  d.innerHTML = `<div class="item-left">
    <h3 class="item-title">Tidak ada data</h3>
    <p class="item-sub">Ubah kata kunci, status, atau sheet.</p>
  </div>`;
  return d;
}

/* ===================== UTILS ===================== */
function statusToClass(raw){
  const key = String(raw || "").trim().toUpperCase();
  return CONFIG.STATUS_MAP[key] ? CONFIG.STATUS_MAP[key] : (key || "PENDING");
}
function safe(v){ return (v===undefined || v===null) ? "" : String(v); }
function debounce(fn, wait=150){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a), wait); }; }
function toast(msg){
  els.toast.textContent = msg;
  els.toast.classList.remove("hidden");
  clearTimeout(els.toast._t);
  els.toast._t = setTimeout(()=> els.toast.classList.add("hidden"), 1800);
}
function showLoader(show){ els.loader.classList.toggle("hidden", !show); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }

/* ===================== INIT ===================== */
(async function init(){
  // Restore state
  const savedSheet   = localStorage.getItem(CONFIG.STORAGE.sheet) || CONFIG.DEFAULT_SHEET;
  const savedSection = localStorage.getItem(CONFIG.STORAGE.section) || "katalog";
  const savedQuery   = localStorage.getItem(CONFIG.STORAGE.query) || "";
  const savedStatus  = localStorage.getItem(CONFIG.STORAGE.status) || "";
  const savedSort    = localStorage.getItem(CONFIG.STORAGE.sort) || "name-asc";

  // Sheet list (fallback statis, aman; ganti sesuai tab nyata jika perlu)
  const sheets = [CONFIG.DEFAULT_SHEET, "PreOrder", "Film"].filter((v,i,a)=>a.indexOf(v)===i);
  els.sheetSelect.innerHTML = sheets.map(s => `<option value="${s}" ${s===savedSheet?'selected':''}>${s}</option>`).join("");

  // Controls restore
  els.searchInput.value = savedQuery;
  els.statusFilter.value = savedStatus;
  els.sortSelect.value = savedSort;

  // Data
  await ensureSheetLoaded(els.sheetSelect.value);
  showSection(savedSection); // sekaligus render
})();
