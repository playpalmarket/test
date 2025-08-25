// Simple mobile menu controller (independen dari framework)
(() => {
  const burger = document.getElementById('burger');
  const sheet  = document.getElementById('mobileNav');

  if (!burger || !sheet) return;

  const open = () => {
    sheet.hidden = false;
    burger.classList.add('active');
    burger.setAttribute('aria-expanded', 'true');
    // trap basic focus
    const first = sheet.querySelector('a,button');
    first && first.focus();
  };
  const close = () => {
    sheet.hidden = true;
    burger.classList.remove('active');
    burger.setAttribute('aria-expanded', 'false');
    burger.focus();
  };

  burger.addEventListener('click', () => {
    if (sheet.hidden) open(); else close();
  });

  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) close(); // klik backdrop
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) close();
  });

  // Tutup saat navigasi link ditekan
  sheet.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
})();
