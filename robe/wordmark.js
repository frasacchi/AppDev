// Font picker + logo reveal, porting ios-robe/Robe/Views/LaunchSplash.swift and
// Robe/Theme/BrandFont.swift's WordmarkFont exactly: same 6 fonts, same
// per-font rShare/aspect geometry (from make_all_wordmarks.py's own viewBox
// output), same reveal timing. The R figure never changes — only the OBE
// lettering's font, and therefore the word's width, does.

const FONTS = {
  playfair:    { title: "Playfair Display", asset: "Playfair",    rShare: 0.251560, aspect: 2.151082 },
  bodoni:      { title: "Bodoni Moda",      asset: "Bodoni",      rShare: 0.263769, aspect: 2.051515 },
  cinzel:      { title: "Cinzel",           asset: "Cinzel",      rShare: 0.232169, aspect: 2.330736 },
  abril:       { title: "Abril Fatface",    asset: "Abril",       rShare: 0.260933, aspect: 2.073810 },
  prata:       { title: "Prata",            asset: "Prata",       rShare: 0.223994, aspect: 2.415801 },
  librecaslon: { title: "Libre Caslon",     asset: "Librecaslon", rShare: 0.250803, aspect: 2.157576 },
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

  const navMark = document.getElementById("nav-mark");
  if (navMark) navMark.src = `assets/wordmarks/RobeWordmark${font.asset}.svg`;

  const heroMark = document.getElementById("hero-mark");
  if (heroMark) heroMark.src = `assets/wordmarks/RobeWordmark${font.asset}White.svg`;

  const footerMark = document.getElementById("footer-mark");
  if (footerMark) footerMark.src = `assets/wordmarks/RobeWordmark${font.asset}White.svg`;

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

// --- Opening splash: R alone -> "OBE" reveals -> tagline fades in -> fades out.

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
    wrap.style.transition = "width 0.95s ease-in-out";
    setProgress(1);
    setTimeout(() => {
      tagline.classList.add("visible");
      setTimeout(() => {
        splash.classList.add("fade-out");
        setTimeout(() => { splash.style.display = "none"; finish(); }, 400);
      }, 1000);
    }, 700);
  }, 350);
}

document.addEventListener("DOMContentLoaded", () => {
  applyFont(currentFont());
  const toggleContainers = document.querySelectorAll(".font-toggle");
  toggleContainers.forEach(buildFontToggle);
  applyFont(currentFont());
  playSplash();
});
