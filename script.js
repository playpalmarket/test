// ===== Ripple attach ke elemen klik-able =====
(function(){
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
  // Auto-apply ke elemen yang relevan
  document.querySelectorAll('.ripple, .menu-btn, .list-item, .icon-btn').forEach(attachRipple);
})();

// ===== Dropdown Kategori (Material custom select) =====
(function(){
  const wrap = document.getElementById('custom-select-wrapper');
  const btn  = document.getElementById('custom-select-btn');
  const val  = document.getElementById('custom-select-value');
  const box  = document.getElementById('custom-select-options');

  if (!wrap || !btn || !val || !box) return;

  // Ambil data kategori dari window.CATEGORIES (kalau ada), atau fallback contoh
  const CATEGORIES = (window.CATEGORIES && Array.isArray(window.CATEGORIES) && window.CATEGORIES.length)
    ? window.CATEGORIES
    : [
        { id: 'ffid',   name: 'Free Fire Indonesia' },
        { id: 'ml',     name: 'Mobile Legends' },
        { id: 'pubg',   name: 'PUBG Mobile' },
        { id: 'genshin',name: 'Genshin Impact' }
      ];

  // Render opsi
  box.innerHTML = '';
  CATEGORIES.forEach((cat, i)=>{
    const opt = document.createElement('div');
    opt.className = 'custom-select-option';
    opt.setAttribute('role','option');
    opt.dataset.id = cat.id;
    opt.textContent = cat.name;
    if(i===0) opt.classList.add('selected');
    box.appendChild(opt);
  });
  val.textContent = CATEGORIES[0].name;

  // Open/close
  function open(){ wrap.classList.add('open'); btn.setAttribute('aria-expanded','true'); }
  function close(){ wrap.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); wrap.classList.toggle('open'); btn.setAttribute('aria-expanded', String(wrap.classList.contains('open'))); });
  document.addEventListener('click', close);
  window.addEventListener('scroll', close, {passive:true});

  // Pilih opsi
  box.addEventListener('click', (e)=>{
    const opt = e.target.closest('.custom-select-option');
    if(!opt) return;
    box.querySelectorAll('.custom-select-option').forEach(o=>o.classList.remove('selected'));
    opt.classList.add('selected');
    val.textContent = opt.textContent;
    close();

    // Callback ke logika katalogmu (kalau ada)
    if (typeof window.onCategoryChange === 'function') {
      window.onCategoryChange(opt.dataset.id, opt.textContent);
    }
  });
})();

// ===== Burger Menu (menu <-> close) =====
(function(){
  function bindBurger(bid, mid){
    const btn = document.getElementById(bid);
    const menu = document.getElementById(mid);
    if(!btn || !menu) return;
    const icon = btn.querySelector('.material-symbols-rounded');

    const close = ()=>{ menu.classList.remove('open'); btn.setAttribute('aria-expanded','false'); if(icon) icon.textContent='menu'; };
    const open  = ()=>{ menu.classList.add('open');  btn.setAttribute('aria-expanded','true');  if(icon) icon.textContent='close'; };

    btn.addEventListener('click', (e)=>{ e.stopPropagation(); menu.classList.contains('open') ? close() : open(); });
    document.addEventListener('click', (e)=>{ if(!menu.contains(e.target) && !btn.contains(e.target)) close(); });

    // Tutup saat klik item menu
    menu.addEventListener('click', (e)=>{
      if (e.target.closest('.menu-btn')) close();
    });
  }
  bindBurger('burgerCat','menuCat');
  // Kalau nanti ada halaman lain, aktifkan juga:
  bindBurger('burgerPO','menuPO');
  bindBurger('burgerFilm','menuFilm');
})();
