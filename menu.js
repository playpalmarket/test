// menu.js
(function (global) {
  // REFACTOR: Satu-satunya sumber kebenaran untuk item menu
  const MENU_ITEMS = [
    { label:'Katalog', type:'route', value:'katalog' },
    { label:'Lacak Pre‑Order', type:'route', value:'preorder' },
    { divider:true },
    { label:'Donasi (Saweria)', type:'link', href:'https://saweria.co/playpal' },
    { divider:true },
    { label:'Tutup', type:'close' }
  ];

  function renderMenu(container, items, onRoute, closeAll) {
    if (!container) return;
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
        btn.addEventListener('click', () => { onRoute?.(item.value); });
      } else if(item.type === 'link') {
        btn.addEventListener('click', () => { window.open(item.href, '_blank', 'noopener'); });
      }
      // Semua tombol, termasuk 'close', akan menutup menu
      btn.addEventListener('click', closeAll);

      container.appendChild(btn);
    });
  }

  function init({ burgers, menus, onRoute }) {
    const closeAll = () => {
      burgers.forEach(b => b?.classList.remove('active'));
      menus.forEach(m => m?.classList.remove('open'));
    };
    
    const toggle = (btn, menu) => {
      const isOpen = menu?.classList.contains('open');
      closeAll();
      if (!isOpen) { 
        btn?.classList.add('active'); 
        menu?.classList.add('open'); 
      }
    };
    
    menus.forEach(m => renderMenu(m, MENU_ITEMS, onRoute, closeAll));
    
    burgers.forEach((burger, index) => {
        const menu = menus[index];
        burger?.addEventListener('click', (e) => {
            e.stopPropagation(); // Mencegah event click langsung menutup menu
            toggle(burger, menu);
        });
    });

    document.addEventListener('click', (e) => {
      const isInsideMenu = menus.some(m => m.contains(e.target));
      const isBurger = burgers.some(b => b.contains(e.target));
      if (!isInsideMenu && !isBurger) {
        closeAll();
      }
    });

    return { closeAll };
  }

  global.MenuModule = { init };
})(window);
