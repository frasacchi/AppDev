// Font picker + logo reveal, porting ios-robe/Robe/Views/LaunchSplash.swift and
// Robe/Theme/BrandFont.swift's WordmarkFont exactly: same 6 fonts, same
// per-font rShare/aspect geometry (from make_all_wordmarks.py's own viewBox
// output), same reveal timing. The R figure never changes — only the OBE
// lettering's font, and therefore the word's width, does.
// `cuts`: where O's ink starts, where B and E begin, and where E's ink ends, as
// shares of the wordmark's width, so the intro can type the letters one by one
// (measured from the font files that tools/dev/make_all_wordmarks.py uses).

const FONTS = {
  playfair:    { title: "Playfair Display", asset: "Playfair",    rShare: 0.251560, aspect: 2.151082, trace: 4.5, fill: 0.3, cuts: [0.258, 0.5302, 0.7765, 0.9851] },
  bodoni:      { title: "Bodoni Moda",      asset: "Bodoni",      rShare: 0.263769, aspect: 2.051515, trace: 4.0, fill: 0.28, cuts: [0.274, 0.5234, 0.7711, 0.9873] },
  cinzel:      { title: "Cinzel",           asset: "Cinzel",      rShare: 0.232169, aspect: 2.330736, trace: 3.5, fill: 0.24, cuts: [0.2439, 0.5376, 0.7777, 0.9908] },
  abril:       { title: "Abril Fatface",    asset: "Abril",       rShare: 0.260933, aspect: 2.073810, trace: 6.0, fill: 0.34, cuts: [0.2697, 0.5255, 0.7701, 0.9831] },
  prata:       { title: "Prata",            asset: "Prata",       rShare: 0.223994, aspect: 2.415801, trace: 2.5, fill: 0.18, cuts: [0.2367, 0.5056, 0.7556, 0.9809] },
  librecaslon: { title: "Libre Caslon",     asset: "Librecaslon", rShare: 0.250803, aspect: 2.157576, trace: 3.5, fill: 0.22, cuts: [0.2648, 0.5249, 0.7611, 0.9773] },
};

const HEADING_FONT = {
  playfair: '"Playfair Display", serif',
  bodoni: '"Bodoni Moda", serif',
  cinzel: '"Cinzel", serif',
  abril: '"Abril Fatface", serif',
  prata: '"Prata", serif',
  librecaslon: '"Libre Caslon Display", serif',
};

const STORAGE_KEY = "robeWordmarkFont";
const DEFAULT_FONT = "playfair";

function currentFont() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && FONTS[saved]) return saved;
  } catch (e) {}
  return DEFAULT_FONT;
}

function applyFont(key) {
  const font = FONTS[key] || FONTS[DEFAULT_FONT];
  document.documentElement.style.setProperty("--font-heading", HEADING_FONT[key] || HEADING_FONT[DEFAULT_FONT]);

  // All three marks are masks over the white artwork, so CSS decides their colour.
  ["nav-mark", "hero-mark", "footer-mark"].forEach((id) => {
    const mark = document.getElementById(id);
    if (!mark) return;
    mark.style.setProperty("--mark-url", `url("assets/wordmarks/RobeWordmark${font.asset}White.svg")`);
    mark.style.setProperty("--mark-aspect", String(font.aspect));
    // The live R figure beside the lettering (see liveMarks below).
    const live = LIVE_MARKS[id];
    if (live) {
      live.wrap.style.setProperty("--r-share", String(font.rShare));
      live.figure.setWeight(font.trace, font.fill);
    }
  });

  document.querySelectorAll(".font-toggle button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.font === key);
  });
}

function chooseFont(key) {
  applyFont(key);
  try { localStorage.setItem(STORAGE_KEY, key); } catch (e) {}
}

function buildFontToggle(container) {
  container.innerHTML = "";
  Object.entries(FONTS).forEach(([key, font]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.font = key;
    btn.textContent = font.title;
    btn.addEventListener("click", () => chooseFont(key));
    container.appendChild(btn);
  });
}

// --- Purple palette picker (in the page's Design picks panel). "logo" is the
// exact violet baked into the wordmark SVGs (#5B2BD6); the rest are candidates to
// compare against it. All are dark enough for white text. Light or dark pages are
// the header's theme toggle (motion.js).

const PALETTES = {
  plum:      { title: "Robe plum (current)", hex: "#3D1A5B" },
  logo:      { title: "Logo violet",         hex: "#5B2BD6" },
  royal:     { title: "Royal purple",        hex: "#4B2A9B" },
  grape:     { title: "Grape",               hex: "#5A2D82" },
  amethyst:  { title: "Amethyst",            hex: "#7040B0" },
  orchid:    { title: "Orchid",              hex: "#8A3FA8" },
  mulberry:  { title: "Mulberry",            hex: "#6B2A6E" },
  aubergine: { title: "Aubergine",           hex: "#2E1245" },
  lilac:     { title: "Lilac",               hex: "#7B5FC4" },
};

const PALETTE_KEY = "robePalette";
const DEFAULT_PALETTE = "plum";

function readPref(key, valid, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v && valid[v]) return v;
  } catch (e) {}
  return fallback;
}

function applyPalette(key) {
  const p = PALETTES[key] || PALETTES[DEFAULT_PALETTE];
  document.documentElement.style.setProperty("--robe-plum", p.hex);
  document.querySelectorAll(".swatch-toggle button").forEach((b) => {
    b.classList.toggle("active", b.dataset.palette === key);
  });
}

function buildSwatchToggle(container) {
  container.innerHTML = "";
  Object.entries(PALETTES).forEach(([key, p]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.palette = key;
    btn.title = p.hex;
    btn.innerHTML = `<span class="dot" style="background:${p.hex}"></span>${p.title}`;
    btn.addEventListener("click", () => {
      applyPalette(key);
      try { localStorage.setItem(PALETTE_KEY, key); } catch (e) {}
    });
    container.appendChild(btn);
  });
}

// --- Live marks: each logo's R is drawn by figure.js so her skirt can catch the
// wind; the CSS-mask lettering beside it is clipped to start after the R.

const LIVE_MARKS = {};

function liveMarks() {
  if (!window.RobeFigure) return;
  ["nav-mark", "hero-mark", "footer-mark"].forEach((id) => {
    const mark = document.getElementById(id);
    if (!mark) return;
    const wrap = document.createElement("span");
    wrap.className = `live-mark live-${id}`;
    mark.parentNode.insertBefore(wrap, mark);
    wrap.appendChild(mark);
    const figure = window.RobeFigure.create();
    wrap.appendChild(figure.svg);
    LIVE_MARKS[id] = { wrap, figure };
    // A puff on hover and on tap.
    wrap.addEventListener("mouseenter", () => figure.puff(0.85, 0.22, 1.1));
    wrap.addEventListener("click", () => figure.puff(0.9, 0.22, 1.1));
  });
}

// --- Opening splash (timings in intro-motion.js): the woman from the R stands
// large, adjusts her hat, hits the R pose, then glides left into the logo while
// O, B and E type in behind a blush caret; the tagline fades in and it all lifts.

function playSplash() {
  const splash = document.getElementById("splash");
  const letters = splash ? [...splash.querySelectorAll(".splash-letter")] : [];
  const caret = splash && splash.querySelector(".splash-caret");
  const sparkle = splash && splash.querySelector(".splash-sparkle");
  const tagline = document.getElementById("splash-tagline");
  const intro = window.RobeIntro;
  if (!splash || letters.length !== 3 || !caret || !tagline || !intro || !window.RobeFigure) {
    if (splash) splash.style.display = "none";
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const font = FONTS[currentFont()] || FONTS[DEFAULT_FONT];
  const FIG_ASPECT = 250 / 462;

  const figure = window.RobeFigure.create(font.trace, font.fill);
  figure.svg.classList.add("splash-figure");
  splash.insertBefore(figure.svg, splash.firstChild);
  letters.forEach((img) => { img.src = `assets/wordmarks/RobeWordmark${font.asset}White.svg`; });
  document.body.classList.add("no-scroll");

  // She starts with the R `start` tall (and grows), and ends as the logo's R, `end` tall.
  let cx, cy, start, end, wordWidth, wordLeft;
  function measure() {
    cx = window.innerWidth / 2;
    cy = window.innerHeight / 2 - 12;
    start = Math.min(window.innerHeight * 0.34, 240);
    end = Math.min(start, (window.innerWidth * 0.86) / font.aspect);
    wordWidth = end * font.aspect;
    wordLeft = cx - wordWidth / 2;
    // Each copy of the artwork shows one letter, so each can strike on its own.
    letters.forEach((img, i) => {
      const a = i === 0 ? font.rShare : font.cuts[i];
      const b = i === 2 ? 1 : font.cuts[i + 1];
      img.style.width = `${wordWidth}px`;
      img.style.height = `${end}px`;
      img.style.left = `${wordLeft}px`;
      img.style.top = `${cy - end / 2}px`;
      img.style.clipPath = `inset(-10% ${(1 - b) * 100}% -10% ${a * 100}%)`;
      img.style.transformOrigin = `${((a + b) / 2) * 100}% 95%`;
    });
    caret.style.width = `${Math.max(2, end * 0.016)}px`;
    caret.style.height = `${(intro.CARET_BOTTOM - intro.CARET_TOP) * end}px`;
    caret.style.top = `${cy - end / 2 + intro.CARET_TOP * end}px`;
    tagline.style.left = `${cx}px`;
    tagline.style.top = `${cy + end / 2 + 22}px`;
  }

  function draw(frame) {
    const h = intro.figureHeight(frame, start, end);
    const w = h * FIG_ASPECT;
    // Centred on her own at first, then on the R's place in the centred word.
    const endX = wordLeft + (end * FIG_ASPECT) / 2;
    const fx = cx + (endX - cx) * frame.travel;
    const left = fx - w / 2, top = cy - h / 2;
    figure.svg.style.width = `${w}px`;
    figure.svg.style.height = `${h}px`;
    figure.svg.style.transform = `translate(${left}px, ${top}px)`;
    figure.setFrame(frame.pose, frame.swish);

    letters.forEach((img, i) => {
      const s = intro.strike(frame.strikes[i]);
      img.style.opacity = frame.strikes[i] > 0 ? s.alpha : 0;
      img.style.transform = `translateY(${s.drop * end}px) scale(${s.scale})`;
    });
    caret.style.opacity = frame.caret;
    // Just before O, then after each letter typed.
    const gap = (frame.typed === 0 ? -0.03 : 0.01) * end;
    caret.style.left = `${wordLeft + font.cuts[frame.typed] * wordWidth + gap}px`;

    if (sparkle) {
      if (frame.sparkle < 0) sparkle.style.opacity = 0;
      else {
        // A twinkle off the brim's tip once the hat is set.
        const [tx, ty] = intro.hatPoint(intro.BRIM_TIP[0], intro.BRIM_TIP[1], frame.pose);
        const size = h * 0.09 * Math.sin(Math.PI * frame.sparkle);
        const x = left + ((tx - 14) / 250) * w + h * 0.02;
        const y = top + ((ty + 6) / 462) * h - h * 0.03;
        sparkle.style.opacity = 1;
        sparkle.style.width = sparkle.style.height = `${size}px`;
        sparkle.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px) rotate(${frame.sparkle * 90}deg)`;
      }
    }
    tagline.style.opacity = frame.tagline;
    tagline.style.transform = `translate(-50%, ${(1 - frame.tagline) * 8}px)`;
    splash.style.opacity = frame.fade;
  }

  function finish() {
    splash.classList.add("fade-out");
    splash.style.display = "none";
    document.body.classList.remove("no-scroll");
    window.removeEventListener("resize", measure);
    // The header's logo catches a soft puff as the page appears.
    const nav = LIVE_MARKS["nav-mark"];
    if (nav) nav.figure.puff(0.6, 0.3, 1.2);
  }

  measure();
  window.addEventListener("resize", measure);
  splash.style.transition = "none";

  if (reduceMotion) {
    // The finished logo and tagline, a moment's pause, then it fades.
    draw({ ...intro.at(intro.DURATION), fade: 1, caret: 0 });
    setTimeout(() => {
      splash.style.transition = "";
      splash.style.opacity = "";
      splash.classList.add("fade-out");
      setTimeout(finish, 400);
    }, 1200);
    return;
  }

  const begin = performance.now();
  function tick(now) {
    const t = (now - begin) / 1000;
    draw(intro.at(t));
    if (t < intro.DURATION) requestAnimationFrame(tick);
    else finish();
  }
  draw(intro.at(0));
  requestAnimationFrame(tick);
}

document.addEventListener("DOMContentLoaded", () => {
  liveMarks();
  applyFont(currentFont());
  const toggleContainers = document.querySelectorAll(".font-toggle");
  toggleContainers.forEach(buildFontToggle);
  applyFont(currentFont());
  document.querySelectorAll(".swatch-toggle").forEach(buildSwatchToggle);
  applyPalette(readPref(PALETTE_KEY, PALETTES, DEFAULT_PALETTE));
  playSplash();
});
