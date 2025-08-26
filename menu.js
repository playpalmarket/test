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
    { id:'film',   label:'Tonton Film (Gratis)', type:'link', href:'#' },
    { id:'donasi', label:'Donasi (Saweria)',  type:'link', href:'https://saweria.co/playpal' },
    { id:'ebook',  label:'E-book',            type:'link', href:'#' },
    { id:'assets', label:'Asset Editing',     type:'link', href:'#' }
  ];

  function render(){
    list.innerHTML = '';
    ITEMS.forEach(item=>{
      if(item.divider){ const d=document.createElement('div'); d.className='menu-divider'; list.appendChild(d); return; }
      const btn=document.createElement('button'); btn.className='menu-btn'; btn.type='button'; btn.textContent=item.label;
      if(item.type==='link'){
        btn.addEventListener('click', ()=>{ window.open(item.href,'_blank','noopener'); close(); });
      }else{
        btn.addEventListener('click', ()=>{
          window.AppNavigation?.setMode?.(item.id);
          titleEl.textContent = item.label;
          close();
        });
      }
      list.appendChild(btn);
    });
  }

  function open(){ sidebar.classList.add('open'); burger.classList.add('active'); burger.setAttribute('aria-expanded','true'); document.body.classList.add('sidebar-open'); }
  function close(){ sidebar.classList.remove('open'); burger.classList.remove('active'); burger.setAttribute('aria-expanded','false'); document.body.classList.remove('sidebar-open'); }
  function toggle(){ sidebar.classList.contains('open') ? close() : open(); }
  function outsideClose(e){ const inside = sidebar.contains(e.target) || burger.contains(e.target); if(!inside) close(); }

  // init
  render();
  burger?.addEventListener('click', toggle, {passive:true});
  document.addEventListener('click', outsideClose, {passive:true});
  document.getElementById('komunitas-btn')?.addEventListener('click', ()=>{
    window.open('https://t.me/+something-playpal', '_blank', 'noopener'); // ganti ke link komunitasmu
    close();
  });
})();
