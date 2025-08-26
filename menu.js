// menu.js (Clean & Focused – sidebar tunggal)
(function () {
  const burger = document.getElementById('master-burger');
  const sidebar = document.getElementById('sidebar-menu');
  const list = document.getElementById('sidebarContent');
  const titleEl = document.getElementById('headerTitle');

  const ITEMS = [
    { id:'katalog',  label:'Katalog',         type:'route' },
    { id:'preorder', label:'Lacak Pre-Order', type:'route' },
    { id:'accounts', label:'Akun Game',       type:'route' },
    { divider:true },
    { id:'film',   label:'Tonton Film (Gratis)', type:'route' },
    { id:'donasi', label:'Donasi (Saweria)',     type:'link', href:'https://saweria.co/playpal' },
    { id:'ebook',  label:'E-book',              type:'link',  href:'#' },
    { id:'assets', label:'Asset Editing',       type:'link',  href:'#' }
  ];

  function render(){
    list.innerHTML = '';
    ITEMS.forEach(item=>{
      if(item.divider){
        const d = document.createElement('div'); d.className='menu-divider'; list.appendChild(d); return;
      }
      const btn = document.createElement('button');
      btn.className = 'menu-btn';
      btn.type='button';
      btn.textContent = item.label;
      if(item.type === 'link'){
        btn.addEventListener('click', ()=>{ window.open(item.href,'_blank','noopener'); close(); });
      }else{
        btn.addEventListener('click', ()=>{
          if(window.AppNavigation?.setMode){
            window.AppNavigation.setMode(item.id);
          }else{
            // fallback minimal: ganti section aktif
            document.querySelectorAll('.view-section').forEach(s=>s.classList.remove('active'));
            document.getElementById(`view${capitalize(item.id)}`)?.classList.add('active');
            window.scrollTo({top:0, behavior:'smooth'});
          }
          titleEl.textContent = btn.textContent;
          close();
        });
      }
      list.appendChild(btn);
    });
  }

  function open(){ sidebar.classList.add('open'); burger.classList.add('active'); burger.setAttribute('aria-expanded','true'); }
  function close(){ sidebar.classList.remove('open'); burger.classList.remove('active'); burger.setAttribute('aria-expanded','false'); }
  function toggle(){ sidebar.classList.contains('open') ? close() : open(); }

  function outsideClose(e){
    const inside = sidebar.contains(e.target) || burger.contains(e.target);
    if(!inside) close();
  }

  function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

  // init
  render();
  burger?.addEventListener('click', toggle, {passive:true});
  document.addEventListener('click', outsideClose, {passive:true});
  document.getElementById('komunitas-btn')?.addEventListener('click', ()=>{
    window.open('https://t.me/+something-playpal', '_blank', 'noopener'); // ganti link komunitasmu
    close();
  });
})();
