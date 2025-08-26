// menu.js (refactor)
(function (global) {
  const menuItems = [
    { id: 'toKatalog',  label: 'Katalog',         type: 'route', value: 'katalog' },
    { id: 'toPreorder', label: 'Lacak Pre-Order', type: 'route', value: 'preorder' },
    { id: 'toAccounts', label: 'Akun Game',       type: 'route', value: 'accounts' },
    { divider: true },
    { id: 'film',   label: 'Tonton Film (Gratis)', type: 'route', value: 'film' },
    { id: 'donasi', label: 'Donasi (Saweria)',     type: 'link',  href: 'https://saweria.co/playpal' },
    { id: 'ebook',  label: 'E-book',               type: 'link',  href: '#' },
    { id: 'assets', label: 'Asset Editing',        type: 'link',  href: '#' }
  ];

  const renderMenu = (container, items, onRoute, closeAll) => {
    if (!container) return;
    container.innerHTML = '';
    items.forEach(item => {
      if (item.divider) {
        const divider = document.createElement('div');
        divider.className = 'menu-divider';
        container.appendChild(divider);
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
  };

  const init = ({ burgerCat, burgerPo, burgerAcc, menuCat, menuPo, menuAcc, onRoute }) => {
    const closeAll = () => {
      [burgerCat, burgerPo, burgerAcc].forEach(b => b && b.classList.remove('active'));
      [menuCat, menuPo, menuAcc].forEach(m => m && m.classList.remove('open'));
    };

    const toggle = (btn, menu) => {
      const isOpen = menu?.classList.contains('open');
      closeAll();
      if (!isOpen) { btn?.classList.add('active'); menu?.classList.add('open'); }
    };

    [menuCat, menuPo, menuAcc].forEach(m => renderMenu(m, menuItems, onRoute, closeAll));

    burgerCat?.addEventListener('click', () => toggle(burgerCat, menuCat), { passive: true });
    burgerPo ?.addEventListener('click', () => toggle(burgerPo , menuPo ), { passive: true });
    burgerAcc?.addEventListener('click', () => toggle(burgerAcc, menuAcc), { passive: true });

    document.addEventListener('click', (e) => {
      const target = e.target;
      const inside =
        menuCat?.contains(target)  || burgerCat?.contains(target) ||
        menuPo ?.contains(target)  || burgerPo ?.contains(target) ||
        menuAcc?.contains(target)  || burgerAcc?.contains(target);
      if (!inside) closeAll();
    }, { passive: true });

    return {
      closeAll,
      get items() { return [...menuItems]; },
      set(items)   { menuItems.splice(0, menuItems.length, ...items); [menuCat, menuPo, menuAcc].forEach(m => renderMenu(m, menuItems, onRoute, closeAll)); },
      add(item)    { menuItems.push(item);                            [menuCat, menuPo, menuAcc].forEach(m => renderMenu(m, menuItems, onRoute, closeAll)); },
      insertAt(i, item) { menuItems.splice(i, 0, item);               [menuCat, menuPo, menuAcc].forEach(m => renderMenu(m, menuItems, onRoute, closeAll)); }
    };
  };

  global.MenuModule = { init };
})(window);
