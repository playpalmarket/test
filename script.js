/* =========================
   PlayPal.ID — Frontend vFinal
   Fokus: stabilitas toggle, layout rapih, dan fetch Google Sheets (gviz)
   ========================= */

const CONFIG = {
  SHEET_ID: "1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw",
  DEFAULT_SHEET: "Sheet1",

  // Alias header → kolom yang kamu pakai di Sheet.
  // Parser akan cari salah satu dari alias di baris header (case-insensitive).
  COLUMN_ALIASES: {
    name: ["nama", "name", "buyer", "user"],
    item: ["item", "produk", "product", "paket", "order"],
    status: ["status", "state", "progress"]
  },

  // Mapping status → class badge
  STATUS_MAP: {
    "SUCCESS": "success",
    "DONE": "success",
    "SELESAI": "success",
    "PROGRESS": "progress",
    "PROCESS": "progress",
    "ON PROGRESS": "progress",
    "PENDING": "pending",
    "WAITING": "pending",
    "FAILED": "failed",
    "CANCEL": "failed"
  }
};

const el = {
  burgerBtn: document.getElementById("burgerBtn"),
  dropdown: document.getElementById("dropdown"),
  sheetSelect: document.getElementById("sheetSelect"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  totalInfo: document.getElementById("totalInfo"),
  sections: {
    katalog: document.getElementById("katalog"),
    preorder: document.getElementById("preorder")
  },
  lists: {
    katalog: document.getElementById("listKatalog"),
    preorder: document.getElementById("listPreorder")
  },
  toast: document.getElementById("toast")
};

let currentSection = "katalog";
let cache = {}; // { sheetName: [rows] }
let headerMap = {}; // { sheetName: {name: idx, item: idx, status: idx} }

// =================== UI BEHAVIOR ===================

// Burger toggle — tidak merusak DOM
el.burgerBtn.addEventListener("click", () => {
  el.dropdown.classList.toggle("hidden");
});

// Klik item dropdown → ganti section by toggle
el.dropdown.addEventListener("click", (e) => {
  const btn = e.target.closest(".dropdown-item");
  if (!btn) return;
  const target = btn.dataset.section; // 'katalog' | 'preorder'
  showSection(target);
  el.dropdown.classList.add("hidden");
});

// Close dropdown kalau klik di luar
document.addEventListener("click", (e) => {
  if (!el.dropdown.contains(e.target) && e.target !== el.burgerBtn) {
    el.dropdown.classList.add("hidden");
  }
});

// Search + filter
el.searchInput.addEventListener("input", renderActiveSection);
el.statusFilter.addEventListener("change", renderActiveSection);

// Change sheet
el.sheetSelect.addEventListener("change", async () => {
  await ensureSheetLoaded(el.sheetSelect.value);
  renderActiveSection();
  toast(`Berpindah ke sheet: ${el.sheetSelect.value}`);
});

// =================== SECTION TOGGLING ===================

function showSection(section) {
  if (!el.sections[section]) return;
  currentSection = section;

  // Toggle kelas active — elemen tidak dihancurkan (konten tetap ada)
  Object.keys(el.sections).forEach(id => {
    el.sections[id].classList.toggle("active", id === section);
  });

  renderActiveSection();
}

// =================== DATA ===================

function gvizUrl(sheetName) {
  const base = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq`;
  // tqx=out:json menghasilkan JSON “dibungkus” boilerplate — kita parse manual.
  const params = new URLSearchParams({
    tqx: "out:json",
    sheet: sheetName
  });
  return `${base}?${params.toString()}`;
}

async function fetchSheetRows(sheetName) {
  const res = await fetch(gvizUrl(sheetName), { cache: "no-store" });
  const text = await res.text();

  // Parse “gviz” response → JSON
  const json = JSON.parse(text.replace(/^[\s\S]*setResponse\(/, "").replace(/\);\s*$/, ""));
  const cols = json.table.cols.map(c => (c.label || "").trim());
  const rows = json.table.rows.map(r => (r.c || []).map(cell => (cell ? cell.v : "")));

  // Buat headerMap untuk sheet ini (case-insensitive + alias)
  const lc = cols.map(c => c.toLowerCase());
  headerMap[sheetName] = {
    name: findHeaderIndex(lc, CONFIG.COLUMN_ALIASES.name),
    item: findHeaderIndex(lc, CONFIG.COLUMN_ALIASES.item),
    status: findHeaderIndex(lc, CONFIG.COLUMN_ALIASES.status)
  };

  return rows.slice(1); // baris 0 = header asli (tetap kita pakai mapping di atas)
}

function findHeaderIndex(lowercaseCols, aliasList){
  for (const alias of aliasList){
    const idx = lowercaseCols.indexOf(alias);
    if (idx !== -1) return idx;
  }
  // fallback: kolom 0/1/2 kalau header tak ditemukan
  return Math.min(0, lowercaseCols.length-1);
}

async function ensureSheetLoaded(sheetName){
  if (cache[sheetName]) return;
  try{
    const rows = await fetchSheetRows(sheetName);
    cache[sheetName] = rows;
  }catch(err){
    console.error(err);
    toast("Gagal memuat data. Periksa permission sheet & nama tab.");
    cache[sheetName] = [];
  }
}

// =================== RENDER ===================

function renderActiveSection(){
  const sheetName = el.sheetSelect.value || CONFIG.DEFAULT_SHEET;
  const rows = (cache[sheetName] || []);
  const map = headerMap[sheetName] || {name:0,item:1,status:2};

  const q = (el.searchInput.value || "").trim().toLowerCase();
  const fStatus = (el.statusFilter.value || "").trim().toUpperCase();

  const filtered = rows.filter(r => {
    const name = (r[map.name] || "").toString();
    const item = (r[map.item] || "").toString();
    const statusRaw = (r[map.status] || "").toString();

    const hay = `${name} ${item} ${statusRaw}`.toLowerCase();
    const passQuery = q ? hay.includes(q) : true;

    const statusClass = statusToClass(statusRaw);
    const passStatus = fStatus ? (statusClass && statusClass.toUpperCase()===fStatus) : true;

    return passQuery && passStatus;
  });

  // Info total
  el.totalInfo.textContent = `${filtered.length} total pesanan`;

  // Render ke section aktif
  const container = currentSection === "katalog" ? el.lists.katalog : el.lists.preorder;
  container.innerHTML = "";
  for (const row of filtered){
    const name = safe(row[map.name]);
    const item = safe(row[map.item]);
    const statusRaw = (row[map.status] || "").toString();
    const badgeClass = statusToClass(statusRaw);
    container.appendChild(cardEl(name, item, badgeClass));
  }

  // Jika kosong
  if (!filtered.length){
    const empty = document.createElement("div");
    empty.className = "card";
    empty.innerHTML = `<div class="item-left">
      <h3 class="item-title">Tidak ada data</h3>
      <p class="item-sub">Coba ubah kata kunci atau status.</p>
    </div>`;
    container.appendChild(empty);
  }
}

function statusToClass(statusRaw){
  const key = (statusRaw || "").toString().trim().toUpperCase();
  return CONFIG.STATUS_MAP[key] ? CONFIG.STATUS_MAP[key] : key || "PENDING";
}

function cardEl(name, item, badgeClass){
  const div = document.createElement("article");
  div.className = "card";
  div.setAttribute("role","listitem");
  div.innerHTML = `
    <div class="item-left">
      <h3 class="item-title">${name || "-"}</h3>
      <p class="item-sub">${item || ""}</p>
    </div>
    <div class="item-right">
      <span class="badge ${badgeClass.toLowerCase()}">${(badgeClass || "").toUpperCase()}</span>
    </div>
  `;
  return div;
}

function safe(v){ return (v===undefined || v===null) ? "" : String(v); }

// =================== SHEET DISCOVERY (optional quality-of-life) ===================
// Kita coba ambil daftar sheet via “metadata hack” (tidak resmi). Kalau gagal,
// kita fallback ke daftar statis [DEFAULT_SHEET].
async function loadSheetList(){
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?`;
  try{
    const res = await fetch(url);
    const text = await res.text();
    // Di response awal ada daftar sheet di properti "table" → "parsedNumHeaders" dll,
    // tapi cara paling aman: scrape "table" dari setResponse yang pertama. Kalau gagal, fallback.
    const json = JSON.parse(text.replace(/^[\s\S]*setResponse\(/, "").replace(/\);\s*$/, ""));
    // Kadang ‘json.table.cols’ memuat satu kolom saja → tidak berguna untuk daftar sheet.
    // Jadi kita akan fallback langsung.
    throw new Error("skip discovery");
  }catch{
    // Fallback: izinkan user mengetik sendiri? Untuk stabil, kita pakai list fixed.
    return [CONFIG.DEFAULT_SHEET, "PreOrder", "Katalog"].filter((v,i,self)=>self.indexOf(v)===i);
  }
}

// =================== TOAST ===================
let toastTimer;
function toast(msg){
  el.toast.textContent = msg;
  el.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.toast.classList.add("hidden"), 2200);
}

// =================== INIT ===================
(async function init(){
  // Isi sheetSelect
  const sheets = await loadSheetList();
  el.sheetSelect.innerHTML = sheets.map(s =>
    `<option value="${s}" ${s===CONFIG.DEFAULT_SHEET?'selected':''}>${s}</option>`
  ).join("");

  // Preload data default
  await ensureSheetLoaded(el.sheetSelect.value);

  // Render pertama
  showSection("katalog");
})();
