// menu.js
// Modul mandiri untuk mekanisme burger + daftar menu (modular & reusable)
(function (global) {
  // ====== Konfigurasi awal menu (bisa diedit/diganti runtime) ======
  const MENU_ITEMS = [
    { id:'toKatalog',  label:'Katalog',         type:'route', value:'katalog' },
    { id:'toPreorder', label:'Lacak Pre‑Order', type:'route', value:'preorder' },
    { divider:true },
    // Placeholder siap dipakai:
    { id:'donasi',  label:'Donasi',        type:'link', href:'https://saweria.co/' },
    { id:'ebook',   label:'E‑book',        type:'link', href:'#' },
    { id:'assets',  label:'Asset Editing', type:'link', href:'#' },
    { id:'lainnya', label:'Menu Lainnya',  type:'link', href:'#' }
  ];

  // ====== Util ======
  function renderMenu(container, items, onRoute, closeAll) {
    container.innerHTML = '';
    items.forEach(item => {
      if (item.divider) {
        const d = document.createElement('div');
        d.className = 'menu-divider';
        container.appendChild(d);
        return;
      }
      const btn = document.createElement('button');
      btn.className = 'menu-btn';
      btn.type = 'button';
      btn.textContent = item.label;

      if (item.type === 'route') {
        btn.addEventListener('click', () => { onRoute?.(item.value); closeAll(); });
      } else {
        btn.addEventListener('click', () => { window.open(item.href, '_blank', 'noopener'); closeAll(); });
      }
      container.appendChild(btn);
    });
  }

  // ====== Inisialisasi modul ======
  function init({ burgerCat, burgerPO, menuCat, menuPO, onRoute }) {
    // Render awal
    const closeAll = () => {
      [burgerCat, burgerPO].forEach(b => b && b.classList.remove('active'));
      [menuCat, menuPO].forEach(m => m && m.classList.remove('open'));
    };

    const toggle = (which) => {
      const btn = which === 'cat' ? burgerCat : burgerPO;
      const menu = which === 'cat' ? menuCat  : menuPO;
      const open = menu.classList.contains('open');
      closeAll();
      if (!open) { btn?.classList.add('active'); menu?.classList.add('open'); }
    };

    renderMenu(menuCat, MENU_ITEMS, onRoute, closeAll);
    renderMenu(menuPO,  MENU_ITEMS, onRoute, closeAll);

    // Event handlers
    burgerCat?.addEventListener('click', () => toggle('cat'), { passive:true });
    burgerPO ?.addEventListener('click', () => toggle('po'),  { passive:true });

    // Klik di luar = tutup semua
    document.addEventListener('click', (e) => {
      const inside = (
        menuCat?.contains(e.target)  || burgerCat?.contains(e.target) ||
        menuPO ?.contains(e.target)  || burgerPO ?.contains(e.target)
      );
      if (!inside) closeAll();
    }, { passive:true });

    // API publik untuk ngatur menu dari luar
    const api = {
      closeAll,
      toggle,
      get items() { return [...MENU_ITEMS]; },
      set(items) { // ganti seluruh daftar
        MENU_ITEMS.splice(0, MENU_ITEMS.length, ...items);
        renderMenu(menuCat, MENU_ITEMS, onRoute, closeAll);
        renderMenu(menuPO,  MENU_ITEMS, onRoute, closeAll);
      },
      add(item) { // tambah 1 item
        MENU_ITEMS.push(item);
        renderMenu(menuCat, MENU_ITEMS, onRoute, closeAll);
        renderMenu(menuPO,  MENU_ITEMS, onRoute, closeAll);
      },
      insertAt(index, item) { // sisip di posisi tertentu
        MENU_ITEMS.splice(index, 0, item);
        renderMenu(menuCat, MENU_ITEMS, onRoute, closeAll);
        renderMenu(menuPO,  MENU_ITEMS, onRoute, closeAll);
      }
    };

    return api;
  }

  // Ekspor ke global
  global.MenuModule = { init };
})(window);
