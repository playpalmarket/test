(function(){
  // ========= CONFIG =========
  const SHEET_ID='1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
  const SHEETS={katalog:{name:'Sheet3'},preorder:{name1:'Sheet1',name2:'Sheet2'}};
  const WA_NUMBER='6285877001999';
  const WA_GREETING='*Detail pesanan:*';
  let DATA=[],CATS=[],activeCat='',query='';

  const PAYMENT_OPTIONS = [
    { id: 'seabank', name: 'Seabank', feeType: 'fixed', value: 0 },
    { id: 'gopay', name: 'Gopay', feeType: 'fixed', value: 0 },
    { id: 'dana', name: 'Dana', feeType: 'fixed', value: 125 },
    { id: 'bank_to_dana', name: 'Bank ke Dana', feeType: 'fixed', value: 500 },
    { id: 'qris', name: 'Qris', feeType: 'percentage', value: 0.01 } // 1%
  ];
  let currentSelectedItem = null;

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
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeToggleBtnPO = document.getElementById('theme-toggle-btn-po');
  
  // Payment Modal Elements
  const paymentModal = document.getElementById('paymentModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalItemName = document.getElementById('modalItemName');
  const modalItemPrice = document.getElementById('modalItemPrice');
  const paymentOptionsContainer = document.getElementById('paymentOptions');
  const modalFee = document.getElementById('modalFee');
  const modalTotal = document.getElementById('modalTotal');
  const continueToWaBtn = document.getElementById('continueToWaBtn');

  // ========= MENU ITEMS =========
  const MENU_ITEMS = [
    { label:'Katalog', mode:'katalog' },
    { label:'Lacak Pre‑Order', mode:'preorder' },
    { divider:true },
    { label:'Donasi (Saweria)', href:'https://saweria.co/playpal' }
  ];

  // ========= THEME MANAGER =========
  function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
  }
  
  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(currentTheme);
  }
  
  function toggleTheme() {
    const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }

  // ========= MENU & MODE SWITCHER =========
  function renderMenu(container) {
    container.innerHTML = '';
    MENU_ITEMS.forEach(item => {
      if (item.divider) {
        container.appendChild(document.createElement('div')).className = 'menu-divider';
        return;
      }
      const btn = document.createElement('button');
      btn.className = 'menu-btn';
      btn.textContent = item.label;
      if (item.href) {
        btn.addEventListener('click', () => window.open(item.href, '_blank', 'noopener'));
      } else {
        btn.addEventListener('click', () => setMode(item.mode));
      }
      container.appendChild(btn);
    });
  }

  function closeAllMenus(){
    [burgerCat,burgerPO].forEach(b=>b?.classList.remove('active'));
    [menuCat,menuPO].forEach(m=>m?.classList.remove('open'));
  }

  function toggleMenu(which){
    const btn = which === 'cat' ? burgerCat : burgerPO;
    const menu = which === 'cat' ? menuCat : menuPO;
    const isOpen = menu.classList.contains('open');
    closeAllMenus();
    if (!isOpen) { btn?.classList.add('active'); menu?.classList.add('open'); }
  }

  function setMode(nextMode){
    document.querySelector('.view-section.active')?.classList.remove('active');
    document.getElementById(nextMode === 'katalog' ? 'viewCatalog' : 'viewPreorder')?.classList.add('active');
    closeAllMenus();
    if (nextMode === 'preorder' && !window.poState?.initialized) poInit();
  }
  
  // ========= UTILS =========
  const toIDR=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v);
  const sheetUrlJSON=(sheetName)=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  
  // ========= SKELETON LOADER =========
  function showSkeleton(container, template, count=6){
      container.innerHTML='';
      const frag=document.createDocumentFragment();
      for(let i=0;i<count;i++){frag.appendChild(template.content.cloneNode(true));}
      container.appendChild(frag);
  }

  // ========= KATALOG LOGIC =========
  function parseGVizPairs(txt){const m=txt.match(/\{.*\}/s);if(!m)throw new Error('Invalid GViz.');const obj=JSON.parse(m[0]);const rows=obj.table.rows;const cols=obj.table.cols;const out=[];const gameCols=[];for(let i=0;i<cols.length;i+=2){if(cols[i].label&&cols[i+1])gameCols.push({label:cols[i].label,titleIdx:i,priceIdx:i+1});}for(const r of rows){for(const game of gameCols){const title=r.c[game.titleIdx]?.v;const price=r.c[game.priceIdx]?.v;if(title&&price!=null)out.push({catLabel:game.label,title:title.trim(),price:Number(price)});}}return out;}
  function buildGameSelect(){CATS=DATA.reduce((acc,cur)=>{if(!acc.find(c=>c.label===cur.catLabel))acc.push({label:cur.catLabel});return acc;},[]);customSelectOptions.innerHTML='';CATS.forEach((c,idx)=>{const el=document.createElement('div');el.className='custom-select-option';el.textContent=c.label;el.addEventListener('click',()=>{activeCat=c.label;customSelectValue.textContent=c.label;renderList();toggleCustomSelect(false);});customSelectOptions.appendChild(el);});if(CATS.length>0){activeCat=CATS[0].label;customSelectValue.textContent=CATS[0].label;}}
  function renderList(){const items=DATA.filter(x=>x.catLabel===activeCat&&(query===''||x.title.toLowerCase().includes(query)));listEl.innerHTML='';if(items.length===0){listEl.innerHTML=`<div class="empty">Tidak ada hasil ditemukan.</div>`;countInfoEl.textContent='';return;}const frag=document.createDocumentFragment();for(const it of items){const clone=itemTmpl.content.cloneNode(true);const itemEl=clone.querySelector('.list-item');itemEl.querySelector('.title').textContent=it.title;itemEl.querySelector('.price').textContent=toIDR(it.price);itemEl.addEventListener('click',()=>openPaymentModal(it));frag.appendChild(clone);}listEl.appendChild(frag);countInfoEl.textContent=`${items.length} item ditemukan`;}
  async function loadCatalog(){try{errBox.style.display='none';showSkeleton(listEl,skeletonItemTmpl,9);const res=await fetch(sheetUrlJSON(SHEETS.katalog.name));if(!res.ok)throw new Error('Network error');const txt=await res.text();DATA=parseGVizPairs(txt);buildGameSelect();renderList();}catch(err){console.error(err);listEl.innerHTML='';errBox.style.display='block';errBox.textContent=`Gagal memuat data.`}}
  function toggleCustomSelect(force){customSelectWrapper.classList.toggle('open',force);}

  // ========= PAYMENT MODAL LOGIC =========
  function calculateFee(price,option){if(option.feeType==='fixed')return option.value;if(option.feeType==='percentage')return Math.ceil(price*option.value);return 0;}
  function updatePriceDetails(){const selectedOption=PAYMENT_OPTIONS.find(opt=>opt.id===document.querySelector('input[name="payment"]:checked').value);const fee=calculateFee(currentSelectedItem.price,selectedOption);const total=currentSelectedItem.price+fee;modalFee.textContent=toIDR(fee);modalTotal.textContent=toIDR(total);updateWaLink(selectedOption,fee,total);}
  function updateWaLink(option,fee,total){const{catLabel,title,price}=currentSelectedItem;const text=`${WA_GREETING}\n› Game: ${catLabel}\n› Item: ${title}\n› Pembayaran: ${option.name}\n› Harga: ${toIDR(price)}\n› Fee: ${toIDR(fee)}\n› Total: ${toIDR(total)}`;continueToWaBtn.href=`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;}
  function openPaymentModal(item){currentSelectedItem=item;modalItemName.textContent=item.title;modalItemPrice.textContent=toIDR(item.price);paymentOptionsContainer.innerHTML='';PAYMENT_OPTIONS.forEach((option,index)=>{const fee=calculateFee(item.price,option);paymentOptionsContainer.insertAdjacentHTML('beforeend',`<div class="payment-option"><input type="radio" id="${option.id}" name="payment" value="${option.id}" ${index===0?'checked':''}><label for="${option.id}">${option.name} <span style="float: right;">+ ${toIDR(fee)}</span></label></div>`);});paymentOptionsContainer.querySelectorAll('input[name="payment"]').forEach(input=>input.addEventListener('change',updatePriceDetails));updatePriceDetails();paymentModal.classList.add('visible');}
  function closePaymentModal(){paymentModal.classList.remove('visible');}

  // ========= PRE-ORDER LOGIC =========
  // Disederhanakan karena tidak ada perubahan
  function poInit(){window.poState={initialized:true};const poTotal=document.getElementById('poTotal');poTotal.textContent='Fitur dalam pengembangan.';document.getElementById('poList').innerHTML='';}

  // ========= INITIALIZATION =========
  function init(){
    themeToggleBtn?.addEventListener('click',toggleTheme);
    themeToggleBtnPO?.addEventListener('click',toggleTheme);
    burgerCat?.addEventListener('click',()=>toggleMenu('cat'));
    burgerPO?.addEventListener('click',()=>toggleMenu('po'));
    document.addEventListener('click',e=>{const isOutside=!e.target.closest('.topbar-actions, .menu');if(isOutside)closeAllMenus();});
    
    customSelectBtn?.addEventListener('click',()=>toggleCustomSelect());
    document.addEventListener('click',e=>{if(!e.target.closest('#custom-select-wrapper'))toggleCustomSelect(false);});
    
    let debounceTimer;
    searchEl?.addEventListener('input',e=>{clearTimeout(debounceTimer);debounceTimer=setTimeout(()=>{query=e.target.value.trim().toLowerCase();renderList();},200);});
    
    closeModalBtn?.addEventListener('click',closePaymentModal);
    paymentModal?.addEventListener('click',e=>{if(e.target===paymentModal)closePaymentModal();});

    renderMenu(menuCat);
    renderMenu(menuPO);
    initTheme();
    loadCatalog();
  }
  document.addEventListener('DOMContentLoaded',init);
})();
