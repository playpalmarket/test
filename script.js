(function(){
  // ========= CONFIG =========
  const SHEET_ID='1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
  const SHEETS={katalog:{name:'Sheet3'},preorder:{name1:'Sheet1',name2:'Sheet2'}};
  const WA_NUMBER='6285877001999';
  const WA_GREETING='*Detail pesanan:*';
  let DATA=[],CATS=[],activeCat='',query='';

  // ========= ELEMENTS =========
  const viewCatalog=document.getElementById('viewCatalog');
  const viewPreorder=document.getElementById('viewPreorder');
  const listEl=document.getElementById('list-container');
  const searchEl=document.getElementById('search');
  const countInfoEl=document.getElementById('countInfo');
  const errBox=document.getElementById('error');
  const itemTmpl=document.getElementById('itemTmpl');
  const skeletonItemTmpl=document.getElementById('skeletonItemTmpl');
  const skeletonCardTmpl=document.getElementById('skeletonCardTmpl');
  const customSelectWrapper=document.getElementById('custom-select-wrapper');
  const customSelectBtn=document.getElementById('custom-select-btn');
  const customSelectValue=document.getElementById('custom-select-value');
  const customSelectOptions=document.getElementById('custom-select-options');
  const burgerCat=document.getElementById('burgerCat');
  const burgerPO=document.getElementById('burgerPO');
  const menuCat=document.getElementById('menuCat');
  const menuPO=document.getElementById('menuPO');
  const themeToggleBtn=document.getElementById('theme-toggle-btn');
  const themeToggleBtnPO=document.getElementById('theme-toggle-btn-po');

  // ========= MENU ITEMS =========
  const MENU_ITEMS=[
    {label:'Katalog',mode:'katalog'},
    {label:'Lacak Pre-Order',mode:'preorder'},
    {divider:true},
    {label:'Donasi (Saweria)',href:'https://saweria.co/playpal'},
  ];

  // ========= THEME =========
  function applyTheme(theme){document.body.classList.toggle('dark-mode',theme==='dark');}
  function initTheme(){
    const saved=localStorage.getItem('theme');
    const prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved|| (prefersDark?'dark':'light'));
  }
  function toggleTheme(){
    const newTheme=document.body.classList.contains('dark-mode')?'light':'dark';
    localStorage.setItem('theme',newTheme); applyTheme(newTheme);
  }

  // ========= MENU =========
  function renderMenu(container){
    container.innerHTML='';
    MENU_ITEMS.forEach(item=>{
      if(item.divider){container.appendChild(document.createElement('div')).className='menu-divider';return;}
      const btn=document.createElement('button');
      btn.className='menu-btn';
      btn.textContent=item.label;
      if(item.href){
        btn.addEventListener('click',()=>window.open(item.href,'_blank','noopener'));
      }else{
        btn.addEventListener('click',()=>setMode(item.mode));
      }
      container.appendChild(btn);
    });
  }
  function closeAllMenus(){[burgerCat,burgerPO].forEach(b=>b?.classList.remove('active'));[menuCat,menuPO].forEach(m=>m?.classList.remove('open'));}
  function toggleMenu(which){
    const btn=which==='cat'?burgerCat:burgerPO;
    const menu=which==='cat'?menuCat:menuPO;
    const isOpen=menu.classList.contains('open');
    closeAllMenus();
    if(!isOpen){btn?.classList.add('active');menu?.classList.add('open');btn.setAttribute('aria-expanded','true');} 
    else{btn?.setAttribute('aria-expanded','false');}
  }

  // ========= MODE SWITCH =========
  function setMode(nextMode){
    const current=document.querySelector('.view-section.active');
    const next=document.getElementById(nextMode==='katalog'?'viewCatalog':'viewPreorder');
    if(current===next){closeAllMenus();return;}
    current.classList.remove('active'); next.classList.add('active');
    closeAllMenus(); 
    if(nextMode==='preorder' && !poState.initialized) poInit();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  // ========= UTIL =========
  const prettyLabel=(raw)=>String(raw||'').trim();
  const toIDR=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v);
  const sheetUrlJSON=(sheet)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheet)}&tqx=out:json`;
  const sheetUrlCSV=(sheet)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  function showSkeleton(container,tmpl,count=6){container.innerHTML='';const frag=document.createDocumentFragment();for(let i=0;i<count;i++)frag.appendChild(tmpl.content.cloneNode(true));container.appendChild(frag);}

  // ========= KATALOG =========
  function parseGVizPairs
