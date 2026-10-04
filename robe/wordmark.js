// Font picker + logo reveal, porting ios-robe/Robe/Views/LaunchSplash.swift and
// Robe/Theme/BrandFont.swift's WordmarkFont exactly: same 6 fonts, same
// per-font rShare/aspect geometry (from make_all_wordmarks.py's own viewBox
// output), same reveal timing. The R figure never changes — only the OBE
// lettering's font, and therefore the word's width, does.

const FONTS = {
  playfair:    { title: "Playfair Display", asset: "Playfair",    rShare: 0.251560, aspect: 2.151082, trace: 4.5, fill: 0.3 },
  bodoni:      { title: "Bodoni Moda",      asset: "Bodoni",      rShare: 0.263769, aspect: 2.051515, trace: 4.0, fill: 0.28 },
  cinzel:      { title: "Cinzel",           asset: "Cinzel",      rShare: 0.232169, aspect: 2.330736, trace: 3.5, fill: 0.24 },
  abril:       { title: "Abril Fatface",    asset: "Abril",       rShare: 0.260933, aspect: 2.073810, trace: 6.0, fill: 0.34 },
  prata:       { title: "Prata",            asset: "Prata",       rShare: 0.223994, aspect: 2.415801, trace: 2.5, fill: 0.18 },
  librecaslon: { title: "Libre Caslon",     asset: "Librecaslon", rShare: 0.250803, aspect: 2.157576, trace: 3.5, fill: 0.22 },
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

// --- Purple palette + page-fill toggles.
// "logo" is the exact violet baked into the wordmark SVGs (#5B2BD6); the rest are
// candidates to compare against it. All are dark enough for white text.

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
const FILL_KEY = "robePurpleFill";
const DEFAULT_PALETTE = "plum";
const FILLS = { header: "Top & footer only", page: "Whole page", white: "All white, purple logo" };

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
  document.querySelectorAll(".swatch-toggle:not(.swatch2-toggle) button").forEach((b) => {
    b.classList.toggle("active", b.dataset.palette === key);
  });
}

// Second shade, used for the page body in "Whole page" mode. "auto" leaves the
// CSS default (a darker mix of the first shade) in place.
const SHADE2_KEY = "robePalette2";
const SHADE2_OPTIONS = { auto: { title: "Auto (darker)", hex: null }, ...PALETTES };

function applyShade2(key) {
  const p = SHADE2_OPTIONS[key] || SHADE2_OPTIONS.auto;
  if (p.hex) document.documentElement.style.setProperty("--robe-plum-2", p.hex);
  else document.documentElement.style.removeProperty("--robe-plum-2");
  document.querySelectorAll(".swatch2-toggle button").forEach((b) => {
    b.classList.toggle("active", b.dataset.palette === key);
  });
}

function buildSwatch2Toggle(container) {
  container.innerHTML = "";
  Object.entries(SHADE2_OPTIONS).forEach(([key, p]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.palette = key;
    const dot = p.hex ? `background:${p.hex}` : "background:color-mix(in srgb, var(--robe-plum) 70%, black)";
    btn.innerHTML = `<span class="dot" style="${dot}"></span>${p.title}`;
    btn.addEventListener("click", () => {
      applyShade2(key);
      try { localStorage.setItem(SHADE2_KEY, key); } catch (e) {}
    });
    container.appendChild(btn);
  });
}

function applyFill(key) {
  document.body.classList.toggle("full-purple", key === "page");
  document.body.classList.toggle("show-shade2", key === "page");
  document.body.classList.toggle("all-white", key === "white");
  document.querySelectorAll(".fill-toggle button").forEach((b) => {
    b.classList.toggle("active", b.dataset.fill === key);
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

function buildFillToggle(container) {
  container.innerHTML = "";
  Object.entries(FILLS).forEach(([key, label]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.fill = key;
    btn.textContent = label;
    btn.addEventListener("click", () => {
      applyFill(key);
      try { localStorage.setItem(FILL_KEY, key); } catch (e) {}
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

// --- Opening splash: R alone -> a puff of wind in her skirt -> "OBE" reveals ->
// tagline fades in -> fades out.

function playSplash() {
  const splash = document.getElementById("splash");
  const wrap = document.getElementById("splash-mark-wrap");
  const mark = document.getElementById("splash-mark");
  const tagline = document.getElementById("splash-tagline");
  if (!splash || !wrap || !mark || !tagline) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const key = currentFont();
  const font = FONTS[key] || FONTS[DEFAULT_FONT];

  const rHeight = 96; // px — the R figure's fixed on-screen size, independent of font.
  const width = rHeight * font.aspect;
  const rShare = font.rShare;

  mark.src = `assets/wordmarks/RobeWordmark${font.asset}White.svg`;
  mark.style.height = `${rHeight}px`;
  mark.style.width = `${width}px`;
  wrap.style.height = `${rHeight}px`;
  // The R is the live figure; the artwork shows only the lettering.
  mark.style.clipPath = `inset(0 0 0 ${rShare * 100}%)`;
  let splashFigure = null;
  if (window.RobeFigure) {
    splashFigure = window.RobeFigure.create(font.trace, font.fill);
    splashFigure.svg.classList.add("splash-figure");
    splashFigure.svg.style.height = `${rHeight}px`;
    wrap.appendChild(splashFigure.svg);
  }

  document.body.classList.add("no-scroll");

  function setProgress(progress) {
    const centre = rShare + (1 - rShare) * progress;
    const visibleWidth = width * centre;
    wrap.style.width = `${visibleWidth}px`;
    mark.style.transform = `translateX(0)`;
    wrap.style.marginLeft = "auto";
    wrap.style.marginRight = "auto";
  }

  setProgress(0);

  const finish = () => {
    document.body.classList.remove("no-scroll");
  };

  if (reduceMotion) {
    setProgress(1);
    tagline.classList.add("visible");
    setTimeout(() => {
      splash.classList.add("fade-out");
      setTimeout(() => { splash.style.display = "none"; finish(); }, 400);
    }, 1000);
    return;
  }

  setTimeout(() => {
    if (splashFigure) splashFigure.puff(1, 0.32, 1.25);
    setTimeout(() => {
      wrap.style.transition = "width 0.95s ease-in-out";
      setProgress(1);
      setTimeout(() => {
        tagline.classList.add("visible");
        setTimeout(() => {
          splash.classList.add("fade-out");
          setTimeout(() => {
            splash.style.display = "none";
            finish();
            // The hero's logo catches a softer puff as the page appears.
            const hero = LIVE_MARKS["hero-mark"];
            if (hero) hero.figure.puff(0.75, 0.3, 1.2);
          }, 400);
        }, 1000);
      }, 700);
    }, 550);
  }, 150);
}

document.addEventListener("DOMContentLoaded", () => {
  liveMarks();
  applyFont(currentFont());
  const toggleContainers = document.querySelectorAll(".font-toggle");
  toggleContainers.forEach(buildFontToggle);
  applyFont(currentFont());
  document.querySelectorAll(".swatch-toggle:not(.swatch2-toggle)").forEach(buildSwatchToggle);
  document.querySelectorAll(".swatch2-toggle").forEach(buildSwatch2Toggle);
  applyShade2(readPref(SHADE2_KEY, SHADE2_OPTIONS, "auto"));
  document.querySelectorAll(".fill-toggle").forEach(buildFillToggle);
  applyPalette(readPref(PALETTE_KEY, PALETTES, DEFAULT_PALETTE));
  applyFill(readPref(FILL_KEY, FILLS, "header"));
  playSplash();
});
