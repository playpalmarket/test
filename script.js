(function () {
  const config = {
    // Ganti sheetId dan waNumber dengan data Anda jika perlu
    sheetId: '1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw', 
    waNumber: '6285877001999',
    
    // --- DATA MENU DIGANTI TOTAL AGAR SESUAI GAMBAR ---
    menuItems: [
      { 
        label: 'Home', 
        mode: 'katalog', 
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" /></svg>` 
      },
      { 
        label: 'Layanan', 
        mode: 'layanan', // Anda bisa ganti 'mode' ini jika ada halaman spesifik
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>` 
      },
      { 
        label: 'Pre Order', 
        mode: 'preorder', 
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` 
      },
      { 
        label: 'Akun Game', 
        mode: 'accounts', 
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>` 
      },
       { 
        label: 'Perpustakaan', 
        mode: 'perpustakaan', 
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>` 
      },
      { 
        label: 'Film', 
        mode: 'film', 
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 20.25h12m-7.5-3.75v3.75m-3.75-3.75v3.75m-3.75-3.75v3.75m9-15l-3.75 3.75m3.75-3.75L18 6.75m-3.75-3.75v3.75m-3.75-3.75v3.75m-3.75-3.75v3.75M9 11.25l3-3m-3 3l3 3m-3-3h12m-6 0l3 3m-3-3l3-3" /></svg>` 
      },
      { divider: true },
      { 
        label: 'Komunitas', 
        href: '#', // Ganti '#' dengan link komunitas
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962a3.75 3.75 0 015.962 0zM16.5 9.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM6.75 9.75A2.25 2.25 0 019 7.5h.008a2.25 2.25 0 012.242 2.25 2.25 2.25 0 01-.619 1.642 2.25 2.25 0 01-1.63 1.611V14.25a.75.75 0 01-.75.75h-.008a.75.75 0 01-.75-.75v-1.875A2.25 2.25 0 016.75 9.75z" /></svg>` 
      },
      { 
        label: 'Donasi', 
        href: 'https://saweria.co/playpal', 
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>` 
      },
    ],
  };

  // Sisa kode JavaScript di bawah ini tidak perlu diubah
  // ... (kode lengkap seperti pada respons sebelumnya)

  function getElement(id) { return document.getElementById(id); }
  const elements = {
    viewCatalog: getElement('viewCatalog'), viewPreorder: getElement('viewPreorder'), viewAccounts: getElement('viewAccounts'), listContainer: getElement('listContainer'), searchInput: getElement('searchInput'), countInfo: getElement('countInfo'), errorContainer: getElement('errorContainer'), itemTemplate: getElement('itemTemplate'),
    customSelect: { wrapper: getElement('customSelectWrapper'), btn: getElement('customSelectBtn'), value: getElement('customSelectValue'), options: getElement('customSelectOptions'), },
    burgers: { cat: getElement('burgerCat'), po: getElement('burgerPo'), acc: getElement('burgerAcc'), },
    menus: { cat: getElement('menuCat'), po: getElement('menuPo'), acc: getElement('menuAcc'), },
    themeToggles: { cat: getElement('themeToggleBtn'), po: getElement('themeToggleBtnPo'), acc: getElement('themeToggleBtnAcc'), },
    menuOverlay: getElement('menuOverlay'),
  };
  function closeAllMenus() {
    Object.values(elements.burgers).forEach((b) => b?.classList.remove('active'));
    Object.values(elements.menus).forEach((m) => m?.classList.remove('open'));
    elements.menuOverlay?.classList.remove('open');
  }
  function renderMenu(container) {
    container.innerHTML = '';
    config.menuItems.forEach((item) => {
      if (item.divider) {
        const divider = document.createElement('div');
        divider.className = 'menu-divider';
        container.appendChild(divider);
        return;
      }
      const btn = document.createElement('button');
      btn.className = 'menu-btn';
      btn.innerHTML = `<span class="menu-btn-icon">${item.icon || ''}</span><span class="menu-btn-label">${item.label}</span>`;
      if (item.href) {
        btn.addEventListener('click', () => { window.open(item.href, '_blank', 'noopener'); closeAllMenus(); });
      } else if (item.mode) {
        btn.addEventListener('click', () => { setMode(item.mode); });
      }
      container.appendChild(btn);
    });
  }
  function toggleMenu(menuType) {
    const btn = elements.burgers[menuType];
    const menu = elements.menus[menuType];
    const isOpen = menu?.classList.contains('open');
    closeAllMenus();
    if (!isOpen) {
      btn?.classList.add('active');
      menu?.classList.add('open');
      elements.menuOverlay?.classList.add('open');
    }
  }
  function setMode(mode) {
    closeAllMenus();
    if (mode === 'katalog' || mode === 'preorder' || mode === 'accounts') {
        document.getElementById('viewCatalog').classList.toggle('active', mode === 'katalog');
        document.getElementById('viewPreorder').classList.toggle('active', mode === 'preorder');
        document.getElementById('viewAccounts').classList.toggle('active', mode === 'accounts');
    }
    // Tambahkan logika untuk mode lain jika ada
  }
  function initializeApp() {
    elements.menuOverlay?.addEventListener('click', closeAllMenus);
    elements.burgers.cat?.addEventListener('click', () => toggleMenu('cat'));
    elements.burgers.po?.addEventListener('click', () => toggleMenu('po'));
    elements.burgers.acc?.addEventListener('click', () => toggleMenu('acc'));
    renderMenu(elements.menus.cat);
    renderMenu(elements.menus.po);
    renderMenu(elements.menus.acc);
    // Sisa fungsi initializeApp
  }
  document.addEventListener('DOMContentLoaded', initializeApp);
})();
