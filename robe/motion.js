// The page's motion and small controls: the light/dark switch, the mobile menu,
// the Design picks panel, the rail-count odometer, the hero's entrance and its
// drifting doodles, the phones fanning out with the Buy → Rent switch, the
// sentence that lights up word by word, scroll reveals, and the live R figure on
// How it works and in the finale. Everything rests in place with
// prefers-reduced-motion, and nothing stays hidden without JS.

(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canObserve = "IntersectionObserver" in window;
  const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);

  function onVisible(el, enter, leave, threshold = 0.25) {
    if (!canObserve) { enter(); return; }
    new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? enter() : leave && leave()));
    }, { threshold }).observe(el);
  }

  // --- Light or dark. Dark is the default; the choice is remembered.
  function setUpTheme() {
    const button = document.querySelector(".theme-toggle");
    if (!button) return;
    const show = () => {
      const dark = root.dataset.theme !== "light";
      button.firstElementChild.textContent = dark ? "☾" : "☀";
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    };
    show();
    button.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
      try { localStorage.setItem("robeTheme", root.dataset.theme); } catch (e) {}
      show();
    });
  }

  // --- The mobile menu and the Design picks panel open and close the same way.
  function setUpDisclosure(buttonSelector, panel, openClass) {
    const button = document.querySelector(buttonSelector);
    if (!button || !panel) return;
    const set = (open) => {
      button.setAttribute("aria-expanded", String(open));
      if (openClass) panel.classList.toggle(openClass, open); else panel.hidden = !open;
    };
    button.addEventListener("click", () => set(button.getAttribute("aria-expanded") !== "true"));
    panel.addEventListener("click", (e) => { if (openClass && e.target.closest("a")) set(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  }

  // --- The odometer: how many pieces are on the page's rail, rolling up digit by digit.
  function setUpOdometer() {
    const odo = document.getElementById("rail-odometer");
    const grid = document.querySelector("#listings .listing-grid");
    if (!odo || !grid) return;
    function render(n) {
      const digits = String(n).split("");
      odo.setAttribute("aria-label", `${n} pieces on the rail`);
      odo.replaceChildren(...digits.map(() => {
        const cell = document.createElement("span");
        cell.className = "odo-digit";
        const track = document.createElement("span");
        track.className = "odo-track";
        for (let d = 0; d <= 9; d++) {
          const i = document.createElement("i");
          i.textContent = d;
          track.appendChild(i);
        }
        cell.appendChild(track);
        return cell;
      }));
      const tracks = odo.querySelectorAll(".odo-track");
      const roll = () => digits.forEach((d, i) => { tracks[i].style.transform = `translateY(-${d}em)`; });
      if (reduceMotion) roll(); else requestAnimationFrame(() => requestAnimationFrame(roll));
    }
    const count = () => grid.querySelectorAll(".listing-card").length;
    render(count());
    // The live storefront can replace the sample cards later.
    new MutationObserver(() => render(count())).observe(grid, { childList: true });
  }

  // --- Scroll reveals.
  function setUpReveal() {
    if (reduceMotion || !canObserve) return;
    root.classList.add("motion-ok");
    const once = new IntersectionObserver((entries, observer) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in-view");
        observer.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(".section-heading, .reveal").forEach((el) => {
      el.classList.add("reveal");
      once.observe(el);
    });
    document.querySelectorAll(".step-card").forEach((el, i) => {
      el.classList.add("reveal");
      el.style.setProperty("--reveal-delay", `${i * 90}ms`);
      once.observe(el);
    });
    document.querySelectorAll(".listing-grid, .finale").forEach((el) => once.observe(el));
  }

  // --- The hero rises in once the splash has lifted.
  function setUpHeroEntrance() {
    if (reduceMotion || !canObserve) return;
    const splash = document.getElementById("splash");
    const go = () => root.classList.add("hero-in");
    if (!splash) { go(); return; }
    const watch = new MutationObserver(() => {
      if (splash.classList.contains("fade-out")) { watch.disconnect(); setTimeout(go, 120); }
    });
    watch.observe(splash, { attributes: true, attributeFilter: ["class"] });
    setTimeout(go, 4500); // in case the splash never runs
  }

  // --- Scroll-driven pieces, all in one frame loop: the doodles' parallax, the
  // phones fanning out, and the sentence lighting up.
  function setUpScrollScenes() {
    if (reduceMotion) return;
    const doodles = [...document.querySelectorAll(".doodle")];
    const hero = document.querySelector(".hero");
    const stage = document.querySelector(".phone-stage");
    const reading = document.querySelector(".reading");
    const words = reading ? [...reading.querySelectorAll(".w")] : [];
    const phrase = reading && reading.querySelector(".phrase");
    const progress = reading && reading.querySelector(".reading-progress");
    let pointerX = 0, pointerY = 0, queued = false;

    function frame() {
      queued = false;
      const vh = window.innerHeight;
      if (hero) {
        const scrolled = clamp(-hero.getBoundingClientRect().top / hero.offsetHeight, 0, 1.2);
        doodles.forEach((el) => {
          const depth = Number(el.dataset.depth || 0.4);
          el.style.setProperty("--px", `${pointerX * depth * 18}px`);
          el.style.setProperty("--py", `${-scrolled * depth * 260 + pointerY * depth * 14}px`);
        });
      }
      if (stage) {
        const r = stage.getBoundingClientRect();
        stage.style.setProperty("--fan", clamp((vh - r.top) / (vh * 0.75)).toFixed(3));
      }
      if (reading && words.length) {
        const r = reading.getBoundingClientRect();
        const p = clamp(-r.top / (r.height - vh));
        const lit = Math.round(p * (words.length + 2));
        words.forEach((w, i) => w.classList.toggle("lit", i < lit));
        if (phrase) phrase.classList.toggle("drawn", phrase.querySelector(".w:last-of-type").classList.contains("lit"));
        if (progress) progress.style.setProperty("--read", p.toFixed(3));
      }
    }
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    if (window.matchMedia("(pointer: fine)").matches) {
      window.addEventListener("pointermove", (e) => {
        pointerX = e.clientX / window.innerWidth - 0.5;
        pointerY = e.clientY / window.innerHeight - 0.5;
        queue();
      }, { passive: true });
    }
    frame();
  }

  // --- The Buy → Rent switch flips once the phones are in view.
  function setUpSwitch() {
    const sw = document.querySelector(".buy-rent");
    if (!sw) return;
    if (reduceMotion) { sw.classList.add("on"); return; }
    onVisible(sw, () => setTimeout(() => sw.classList.add("on"), 400), () => sw.classList.remove("on"), 0.9);
  }

  // --- Step 3: the R figure, drawn heavier than the logo so she matches the
  // illustrations' line weight, catching a breeze while the card is on screen.
  function setUpWearFigure() {
    const slot = document.querySelector("[data-figure]");
    if (!slot || !window.RobeFigure) return;
    const figure = window.RobeFigure.create(13, 0.3);
    slot.appendChild(figure.svg);
    onVisible(slot, () => figure.blow(0.55, 1.2), () => figure.blow(0, 0.6));
    const card = slot.closest(".step-card");
    if (card) card.addEventListener("mouseenter", () => figure.puff(1, 0.25, 1.1));
  }

  // --- Step 3's calendar counts up the ten days, rests on 10, and starts again.
  function setUpCalendar() {
    const calendar = document.querySelector(".step-art-wear .calendar");
    const day = calendar && calendar.querySelector(".cal-day");
    if (!day || reduceMotion) return;
    let n = 10, rest = 0, timer = null;
    function tick() {
      if (n === 10 && rest < 3) { rest += 1; return; }
      rest = 0;
      n = n === 10 ? 1 : n + 1;
      day.textContent = String(n);
      calendar.classList.remove("flip");
      void calendar.getBoundingClientRect(); // restart the flip animation
      calendar.classList.add("flip");
    }
    onVisible(calendar, () => { if (!timer) timer = setInterval(tick, 650); }, () => { clearInterval(timer); timer = null; });
  }

  // --- The finale's big logo catches a gust as it lands (wordmark.js makes it live).
  function setUpFinale() {
    const finale = document.querySelector(".finale");
    if (!finale) return;
    onVisible(finale, () => {
      const figure = finale.querySelector(".robe-figure");
      if (!figure) return;
      finale.querySelector(".live-mark")?.dispatchEvent(new MouseEvent("click"));
    }, null, 0.5);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setUpTheme();
    setUpDisclosure(".menu-toggle", document.getElementById("site-nav"), "open");
    setUpDisclosure(".picks-toggle", document.getElementById("design-picks"));
    setUpOdometer();
    setUpReveal();
    setUpHeroEntrance();
    setUpScrollScenes();
    setUpSwitch();
    setUpWearFigure();
    setUpCalendar();
    setUpFinale();
  });
})();
