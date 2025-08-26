// menu.js — sinkron dengan script.js (mode: katalog | preorder | accounts)
(function (global) {
  // Susunan menu (bisa kamu ubah label/urutan sesukanya).
  // Item dengan type 'route' akan memanggil window.setMode(mode).
  // Item lain (type 'link') akan dibuka di tab baru.
  const MENU_ITEMS = [
    { id: 'home',      label: 'Home',        type: 'route', value: 'katalog' },
    { id: 'layanan',   label: 'Layanan',     type: 'route', value: 'katalog' },
    { id: 'preorder',  label: 'Pre-Order',   type: 'route', value: 'preorder' },
    { id: 'accounts',  label: 'Akun Game',   type: 'route', value: 'accounts' },
    { divider: true },
    { id: 'library',   label: 'Perpustakaan', type: 'link', href: '#' },
    { id: 'film',      label: 'Film (Gratis)', type: 'link', href: '#' },
    { id: 'komunitas', label: 'Komunitas',     type: 'link', href: '#' },
    { id: 'donasi',    label: 'Donasi (Saweria)', type: 'link', href: 'https://saweria.co/playpal' }
  ];

  function renderMenu(container, items, onRoute, closeAll) {
    if (!container) return;
    container.innerHTML = '';
    for (const item of items) {
      if (item.divider) {
        const d = document.createElement('div');
        d.className = 'menu-divider';
        container.appendChild(d);
        continue;
      }
      const btn = document.createElement('button');
      btn.className = 'menu-btn';
      btn.type = 'button';
      btn.textContent = item.label;

      if (item.type === 'route') {
        btn.addEventListener('click', () => { onRoute(item.value); closeAll(); });
      } else {
        btn.addEventListener('click', () => { window.open(item.href || '#', '_blank', 'noopener'); closeAll(); });
      }
      container.appendChild(btn);
    }
  }

  function init({ burgerCat, burgerPO, burgerAcc, menuCat, menuPO, menuAcc, onRoute }) {
    // Fallback onRoute → window.setMode dari script.js
    const route = typeof onRoute === 'function'
      ? onRoute
      : (mode) => { if (typeof global.setMode === 'function') global.setMode(mode); };

    const closeAll = () => {
      [burgerCat, burgerPO, burgerAcc].forEach(b => b && b.classList.remove('active'));
      [menuCat, menuPO, menuAcc].forEach(m => m && m.classList.remove('open'));
    };

    const toggle = (btn, menu) => {
      const wasOpen = menu?.classList.contains('open');
      closeAll();
      if (!wasOpen) { btn?.classList.add('active'); menu?.classList.add('open'); }
    };

    // Render awal ke tiap container (semua view pakai daftar yang sama)
    [menuCat, menuPO, menuAcc].forEach(m => renderMenu(m, MENU_ITEMS, route, closeAll));

    // Binding burger
    burgerCat?.addEventListener('click', () => toggle(burgerCat, menuCat), { passive: true });
    burgerPO ?.addEventListener('click', () => toggle(burgerPO , menuPO ), { passive: true });
    burgerAcc?.addEventListener('click', () => toggle(burgerAcc, menuAcc), { passive: true });

    // Klik di luar → tutup
    document.addEventListener('click', (e) => {
      const inside =
        menuCat?.contains(e.target)  || burgerCat?.contains(e.target) ||
        menuPO ?.contains(e.target)  || burgerPO ?.contains(e.target) ||
        menuAcc?.contains(e.target)  || burgerAcc?.contains(e.target);
      if (!inside) closeAll();
    }, { passive: true });

    // Esc → tutup
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });

    // API kecil untuk kustomisasi runtime (opsional)
    return {
      closeAll,
      get items() { return [...MENU_ITEMS]; },
      set(items) {
        MENU_ITEMS.splice(0, MENU_ITEMS.length, ...items);
        [menuCat, menuPO, menuAcc].forEach(m => renderMenu(m, MENU_ITEMS, route, closeAll));
      },
      add(item) {
        MENU_ITEMS.push(item);
        [menuCat, menuPO, menuAcc].forEach(m => renderMenu(m, MENU_ITEMS, route, closeAll));
      },
      insertAt(i, item) {
        MENU_ITEMS.splice(i, 0, item);
        [menuCat, menuPO, menuAcc].forEach(m => renderMenu(m, MENU_ITEMS, route, closeAll));
      }
    };
  }

  global.MenuModule = { init };
})(window);
