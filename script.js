(function(){
  // ========= CONFIG =========
  const SHEET_ID='1B0XPR4uSvRzy9LfzWDjNjwAyMZVtJs6_Kk_r2fh7dTw';
  const SHEETS={katalog:{name:'Sheet3'},preorder:{name1:'Sheet1',name2:'Sheet2'},accounts:{name:'Sheet5'}};
  const WA_NUMBER='6285877001999';
  const WA_GREETING='*Detail pesanan:*';
  let DATA=[],CATS=[],activeCat='',query='';
  const PAYMENT_OPTIONS = [
    { id: 'seabank', name: 'Seabank', feeType: 'fixed', value: 0 },
    { id: 'gopay', name: 'Gopay', feeType: 'fixed', value: 0 },
    { id: 'dana', name: 'Dana', feeType: 'fixed', value: 125 },
    { id: 'bank_to_dana', name: 'Bank ke Dana', feeType: 'fixed', value: 500 },
    { id: 'qris', name: 'Qris', feeType: 'percentage', value: 0.01 }
  ];
  let currentSelectedItem = null;

  // ========= ELEMENTS =========
  const viewCatalog=document.getElementById('viewCatalog');
  const viewPreorder=document.getElementById('viewPreorder');
  const viewAccounts=document.getElementById('viewAccounts');
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

  // Payment Modal Elements
  const paymentModal = document.getElementById('paymentModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalItemName = document.getElementById('modalItemName');
  const modalItemPrice = document.getElementById('modalItemPrice');
  const paymentOptionsContainer = document.getElementById('paymentOptions');
  const modalFee = document.getElementById('modalFee');
  const modalTotal = document.getElementById('modalTotal');
  const continueToWaBtn = document.getElementById('continueToWaBtn');

  // Akun Game Elements
  const accountSelect=document.getElementById('accountSelect');
  const accountDisplay=document.getElementById('accountDisplay');
  const accountEmpty=document.getElementById('accountEmpty');
  const accountError=document.getElementById('accountError');
  const carouselTrack=document.getElementById('carouselTrack');
  const carouselPrev=document.getElementById('carouselPrev');
  const carouselNext=document.getElementById('carouselNext');
  const accountPrice=document.getElementById('accountPrice');
  const accountStatus=document.getElementById('accountStatus');
  const accountDescription=document.getElementById('accountDescription');
  const buyAccountBtn = document.getElementById('buyAccountBtn');
  const offerAccountBtn = document.getElementById('offerAccountBtn');

  // ========= THEME =========
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

  // ========= KATALOG =========
  function toIDR(x){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(x);}
  function sheetUrlJSON(name){return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${name}`;}
  function sheetUrlCSV(name){return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${name}`;}

  function parseGVizPairs(txt){
    const json=JSON.parse(txt.substring(47).slice(0,-2));
    const rows=json.table.rows||[];
    return rows.map(r=>r.c.map(c=>c?.v??''));
  }

  function buildGameSelect(){
    CATS=[...new Set(DATA.map(r=>r[0]).filter(Boolean))];
    customSelectOptions.innerHTML='';
    CATS.forEach((c,i)=>{
      const opt=document.createElement('div');
      opt.className='custom-select-option';
      opt.textContent=c;
      opt.dataset.value=c;
      opt.addEventListener('click',()=>{customSelectValue.textContent=c;activeCat=c;renderList();customSelectWrapper.classList.remove('open');});
      customSelectOptions.appendChild(opt);
      if(i===0){activeCat=c;customSelectValue.textContent=c;}
    });
  }

  function renderList(){
    const items=DATA.filter(r=>r[0]===activeCat).map(r=>({catLabel:r[0],title:r[1],price:Number(r[2]),id:r[3]}));
    listEl.innerHTML='';
    const frag=document.createDocumentFragment();
    items.forEach(it=>{
      const buttonEl=itemTmpl.content.cloneNode(true).firstElementChild;
      buttonEl.querySelector('.title').textContent=it.title;
      buttonEl.querySelector('.price').textContent=toIDR(it.price);
      buttonEl.addEventListener('click',()=>openPaymentModal(it));
      frag.appendChild(buttonEl);
    });
    listEl.appendChild(frag);
    countInfoEl.textContent=`${items.length} item ditemukan`;
  }

  async function loadCatalog(){
    try{
      errBox.style.display='none';
      listEl.innerHTML='';
      const res=await fetch(sheetUrlJSON(SHEETS.katalog.name),{cache:'no-store'});
      const txt=await res.text();
      DATA=parseGVizPairs(txt);
      if(DATA.length===0) throw new Error('Data kosong');
      buildGameSelect();renderList();
    }catch(err){
      console.error("Fetch Katalog failed:",err);
      errBox.style.display='block';errBox.textContent=`Oops, terjadi kesalahan.`;
    }
  }

  // ========= PAYMENT =========
  function calculateFee(price, option){
    if(option.feeType==='fixed') return option.value;
    if(option.feeType==='percentage') return Math.ceil(price*option.value);
    return 0;
  }
  function updatePriceDetails(){
    const selectedOptionId=document.querySelector('input[name="payment"]:checked').value;
    const selectedOption=PAYMENT_OPTIONS.find(opt=>opt.id===selectedOptionId);
    const price=currentSelectedItem.price;
    const fee=calculateFee(price,selectedOption);
    const total=price+fee;
    modalFee.textContent=toIDR(fee);
    modalTotal.textContent=toIDR(total);
    updateWaLink(selectedOption,fee,total);
  }
  function updateWaLink(option,fee,total){
    const {catLabel,title,price}=currentSelectedItem;
    const text=`${WA_GREETING}\n› Tipe: ${catLabel}\n› Item: ${title}\n› Pembayaran: ${option.name}\n› Harga: ${toIDR(price)}\n› Fee: ${toIDR(fee)}\n› Total: ${toIDR(total)}`;
    continueToWaBtn.href=`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  }
  function openPaymentModal(item){
    currentSelectedItem=item;
    modalItemName.textContent=item.title;
    modalItemPrice.textContent=toIDR(item.price);
    paymentOptionsContainer.innerHTML='';
    PAYMENT_OPTIONS.forEach((opt,i)=>{
      const fee=calculateFee(item.price,opt);
      const optionHtml=`<div class="payment-option"><input type="radio" id="${opt.id}" name="payment" value="${opt.id}" ${i===0?'checked':''}><label for="${opt.id}">${opt.name} <span style="float:right;">+ ${toIDR(fee)}</span></label></div>`;
      paymentOptionsContainer.insertAdjacentHTML('beforeend',optionHtml);
    });
    paymentOptionsContainer.querySelectorAll('input[name="payment"]').forEach(inp=>inp.addEventListener('change',updatePriceDetails));
    updatePriceDetails();
    paymentModal.style.display='flex';setTimeout(()=>paymentModal.classList.add('visible'),10);
  }
  function closePaymentModal(){
    paymentModal.classList.remove('visible');
    setTimeout(()=>{paymentModal.style.display='none';currentSelectedItem=null;},200);
  }

  // ========= PRE-ORDER =========
  // ... (kode Pre-order penuh tetap sama dari versi lama: filter, render, pagination)

  // ========= ACCOUNTS =========
  // ... (kode Akun Game penuh tetap sama dari versi lama: parseAccountsSheet, carousel, renderAccount, accountsInit)

  // ========= INIT =========
  function setMode(mode){
    document.querySelectorAll('.view-section').forEach(s=>s.classList.remove('active'));
    if(mode==='katalog'){viewCatalog.classList.add('active');loadCatalog();}
    if(mode==='preorder'){viewPreorder.classList.add('active');}
    if(mode==='accounts'){viewAccounts.classList.add('active');accountsInit();}
    window.scrollTo({top:0,behavior:'smooth'});
  }

  // expose ke menu.js
  window.AppNavigation={ setMode };

  // listeners
  closeModalBtn?.addEventListener('click',closePaymentModal);
  document.getElementById('theme-toggle-btn')?.addEventListener('click',toggleTheme);

  initTheme();
  setMode('katalog');
})();
