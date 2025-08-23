(function(){
  // ====== Ripple (Material) ======
  function attachRipple(el){
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
  document.querySelectorAll('.ripple, .menu-btn, .list-item, .pagination-btn, .icon-btn').forEach(attachRipple);

  // ====== Burger toggle ala Material (menu <-> close) ======
  function bindBurger(burgerBtnId, menuId){
    const btn = document.getElementById(burgerBtnId);
    const menu = document.getElementById(menuId);
    if(!btn || !menu) return;
    const icon = btn.querySelector('.material-symbols-rounded');

    function closeMenu(){
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
      if(icon) icon.textContent = 'menu';
    }
    function openMenu(){
      menu.classList.add('open');
      btn.setAttribute('aria-expanded','true');
      if(icon) icon.textContent = 'close';
    }

    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      if(menu.classList.contains('open')) closeMenu(); else openMenu();
    });

    document.addEventListener('click', (e)=>{
      if(!menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
    });

    // Navigasi cepat via data-route (opsional, biar cocok dengan router kamu)
    menu.addEventListener('click', (e)=>{
      const b = e.target.closest('.menu-btn');
      if(!b) return;
      const route = b.dataset.route;
      if(route && typeof window.setMode === 'function'){
        window.setMode(route);
      }
      closeMenu();
    });
  }

  bindBurger('burgerCat', 'menuCat');
  bindBurger('burgerPO', 'menuPO');
  bindBurger('burgerFilm', 'menuFilm');

  // ====== Custom select open/close (Material) ======
  const csWrap = document.getElementById('custom-select-wrapper');
  const csBtn  = document.getElementById('custom-select-btn');
  const csOpts = document.getElementById('custom-select-options');
  if(csWrap && csBtn && csOpts){
    csBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const open = !csWrap.classList.contains('open');
      csWrap.classList.toggle('open', open);
      csBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', ()=>{ csWrap.classList.remove('open'); csBtn.setAttribute('aria-expanded','false'); });
  }

  // ====== Custom select (Film) ======
  const fsWrap = document.getElementById('filmSelectWrap');
  const fsBtn  = document.getElementById('filmSelectBtn');
  const fsOpts = document.getElementById('filmSelectOptions');
  if(fsWrap && fsBtn && fsOpts){
    fsBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const open = !fsWrap.classList.contains('open');
      fsWrap.classList.toggle('open', open);
      fsBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', ()=>{ fsWrap.classList.remove('open'); fsBtn.setAttribute('aria-expanded','false'); });
  }

  // ====== Modal close helper (kalau kamu pakai) ======
  const vidModal = document.getElementById('vidModal');
  const vidBackdrop = document.getElementById('vidBackdrop');
  const vidClose = document.getElementById('vidClose');
  const gdFolder = document.getElementById('gdFolder');
  const gdFolderBackdrop = document.getElementById('gdFolderBackdrop');
  const gdFolderClose = document.getElementById('gdFolderClose');

  function closeModal(el){ if(el) el.classList.remove('open'); }
  vidClose && vidClose.addEventListener('click', ()=> closeModal(vidModal));
  vidBackdrop && vidBackdrop.addEventListener('click', ()=> closeModal(vidModal));
  gdFolderClose && gdFolderClose.addEventListener('click', ()=> closeModal(gdFolder));
  gdFolderBackdrop && gdFolderBackdrop.addEventListener('click', ()=> closeModal(gdFolder));

  // NOTE:
  // File ini fokus merombak TAMPILAN (Material You).
  // Logic data-mu (katalog/pre-order/film) tetap berjalan dari file yang sudah ada.
  // Kalau sebelumnya script.js berisi logic data, gabungkan bagian ripple & UI bind di atas
  // ke paling bawah file logic-mu agar tidak bentrok.
})();
