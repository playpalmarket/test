/* ==========================================================
   PlayPal — Bless-like interactions
   ========================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* Year in footer */
(() => { const y = $("#y"); if (y) y.textContent = new Date().getFullYear(); })();

/* -------- Dark/Light mode with smooth transition -------- */
(() => {
  const root = document.body;
  const btn  = $("#modeToggle");

  const getPref = () => {
    const saved = localStorage.getItem("pp-theme");
    if (saved) return saved;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  const apply = (m) => {
    root.classList.toggle("dark", m === "dark");
    localStorage.setItem("pp-theme", m);
  };

  apply(getPref());
  btn?.addEventListener("click", () => apply(root.classList.contains("dark") ? "light" : "dark"));
})();

/* -------- Reveal on scroll -------- */
(() => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: .12 });
  $$(".reveal-on-scroll").forEach(el => io.observe(el));
})();

/* -------- Lightweight number tween for stat cards -------- */
(() => {
  const els = $$(".stat-value[data-count]");
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  els.forEach(el => {
    const finalStr = el.getAttribute("data-count");
    const final = parseFloat(finalStr);
    if (Number.isNaN(final)) return;

    const dur = 900 + Math.random() * 600;
    const start = performance.now();

    const unit = el.textContent?.trim().replace(/[0-9.\s]/g, "") || "";

    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const v = Math.round(ease(p) * final);
      el.textContent = unit ? `${v}${unit}` : `${v}`;
      if (p < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
})();

/* -------- Example: wire CTA to section (replace with real link later) -------- */
(() => {
  const btn = document.querySelector(".btn-primary[href='#']");
  btn?.addEventListener("click", (e) => {
    e.preventDefault();
    // scroll ke Pre-Order agar terasa "langsung kerja"
    document.getElementById("viewPreorder")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
