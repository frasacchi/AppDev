// The wardrobe on the site, as in the apps: the shop window (a carousel of one
// corner of the shop at a time), every piece in a grid with filters, and a
// quick view with each piece's photos. The rules and numbers are the apps' (Showcase.kt,
// Palette.kt); the pieces are the apps' sample listings. The web shop
// (shop.html, shop.js) builds its pages from the same parts (window.RobeShowcase).

(function () {
  "use strict";

  const OWNERS = [
    { name: "Maya Collins", area: "Hackney" },
    { name: "Harrods", area: "Knightsbridge", shop: true },
    { name: "Priya Shah", area: "Brixton" },
    { name: "Zara", area: "Regent Street", shop: true },
    { name: "Sophie Laurent", area: "Camden" },
    { name: "Selfridges", area: "Oxford Street", shop: true },
  ];

  // title, brand, size, category, colour, rent (£), owner, favourites, photos
  const SEEDS = [
    ["Scarlet maxi gown", "Self-Portrait", "UK 10 / M", "gowns", "Red", 45, 2, 41, 3],
    ["Polka dot midi dress", "Reformation", "UK 8 / S", "dresses", "Black", 22, 0, 12, 4],
    ["Daisy print tea dress", "Ghost", "UK 12 / M", "dresses", "White", 18, 2, 9, 4],
    ["Chunky knit jumper", "Zara", "UK 10 / M", "knitwear", "Green", 12, 3, 6, 3],
    ["Black satin evening gown", "Needle & Thread", "UK 8 / S", "gowns", "Black", 55, 1, 57, 3],
    ["Striped sundress", "& Other Stories", "UK 10 / M", "dresses", "Pink", 16, 0, 4, 3],
    ["Checked wool blazer", "Massimo Dutti", "UK 12 / M", "jackets", "Beige", 20, 1, 18, 3],
    ["Lilac long-sleeve midi", "Rixo", "UK 6 / XS", "dresses", "Lilac", 28, 2, 23, 3],
    ["Floral chiffon gown", "Needle & Thread", "UK 14 / L", "gowns", "Coral", 38, 2, 30, 4],
    ["Red cashmere jumper", "Uniqlo", "UK 10 / M", "knitwear", "Red", 10, 2, 7, 3],
    ["Burgundy skater dress", "Zara", "UK 10 / M", "dresses", "Burgundy", 14, 3, 3, 3],
    ["Navy tailored blazer", "Reiss", "UK 8 / S", "jackets", "Navy", 24, 1, 15, 3],
    ["White dotted prairie dress", "Rixo", "UK 12 / M", "dresses", "White", 26, 5, 19, 3],
    ["Silver column gown", "Jenny Packham", "UK 10 / M", "gowns", "Silver", 85, 1, 88, 3],
    ["Cream cable knit", "Zara", "UK 14 / L", "knitwear", "Cream", 11, 3, 5, 3],
    ["Forest floral midi", "Ghost", "UK 16 / XL", "dresses", "Green", 17, 5, 8, 3],
    ["Ivory silk blouse", "& Other Stories", "UK 10 / M", "tops", "Ivory", 12, 0, 6, 3],
    ["Black pleated midi skirt", "COS", "UK 10 / M", "bottoms", "Black", 14, 4, 9, 3],
    ["Pink A-line skirt", "Ganni", "UK 8 / S", "bottoms", "Pink", 15, 2, 11, 3],
    ["Navy stripe shirt", "Arket", "UK 8 / S", "tops", "Navy", 9, 4, 4, 3],
    ["Wide-leg trousers", "Toast", "UK 12 / M", "bottoms", "Camel", 13, 5, 7, 3],
    ["Black leather tote", "Mulberry", "One size", "bags", "Black", 22, 1, 26, 3],
    ["Tan crossbody bag", "Zara", "One size", "bags", "Tan", 9, 3, 8, 3],
    ["Gold evening clutch", "Jimmy Choo", "One size", "bags", "Gold", 16, 1, 33, 3],
    ["Cream shoulder bag", "By Far", "One size", "bags", "Cream", 12, 5, 14, 3],
    ["Woven straw tote", "Loewe", "One size", "bags", "Tan", 10, 4, 11, 3],
  ];

  // The owners' deposits and the pieces' condition, in SEEDS order (SampleData).
  const DEPOSITS = [180, 90, 70, 40, 220, 60, 90, 110, 150, 35, 50, 120, 100, 400, 40, 65, 60, 70, 75, 45, 65, 280, 115, 200, 150, 125];
  const CONDITIONS = "VGVGNGVVGGSNVVGGVGVGVVGNVG";
  const CONDITION_TITLES = { N: "New with tags", V: "Very good", G: "Good", S: "Satisfactory" };
  const CATEGORY_TITLES = { dresses: "dresses", gowns: "evening gowns", knitwear: "knitwear", jackets: "jackets & blazers", tops: "tops", bottoms: "skirts & trousers", bags: "bags" };

  // Flat measurements in cm (chest, waist, hips, length) for the fit check, in SEEDS order; bags have none (SampleData).
  const MEASUREMENTS = [
    [45.5, 36.5, 49.5, 150],
    [42, 33, 46, 118],
    [50, 41, 54, 108],
    [53.5, 44.5, null, 62],
    [43, 34, 47, 152],
    [46.5, 37.5, 50.5, 86],
    [51, 42, null, 74],
    [38.5, 29.5, 42.5, 120],
    [52.5, 43.5, 56.5, 146],
    [50.5, 41.5, null, 60],
    [45.5, 36.5, 49.5, 100],
    [45, 36, null, 72],
    [51, 42, 55, 96],
    [44.5, 35.5, 48.5, 150],
    [56.5, 47.5, null, 58],
    [54, 45, 58, 112],
    [48.5, 39.5, null, 70],
    [null, 36.5, 49.5, 78],
    [null, 33, 46, 72],
    [45, 36, null, 62],
    [null, 41, 54, 104],
  ];

  const PIECES = SEEDS.map((s, i) => {
    const n = String(i + 1).padStart(2, "0");
    const photos = [`assets/garments/garment-${n}.webp`];
    for (let k = 2; k <= s[8]; k++) photos.push(`assets/garments/garment-${n}-${k}.webp`);
    const owner = OWNERS[s[6]];
    // Every deposit meets the 8% rule: at least 12.5 times the rent, in whole pounds (RentDepositRule).
    const deposit = Math.max(DEPOSITS[i], Math.ceil((s[5] * 100) / 8));
    const details = s[3] === "bags"
      ? (owner.shop ? `${s[0]} from the ${owner.name} rental edit. Checked and conditioned between every rental.`
        : `${s[0]} from ${s[1]}. Carried a handful of times and kept in its dust bag. Message me with any questions.`)
      : (owner.shop ? `${s[4]} ${CATEGORY_TITLES[s[3]]} from the ${owner.name} rental edit. Professionally cleaned and pressed between every rental.`
        : `${s[4]} ${CATEGORY_TITLES[s[3]]} from ${s[1]}. Worn a handful of times and kept on a padded hanger. Message me with any questions about fit.`);
    return {
      id: n, title: s[0], brand: s[1], size: s[2], category: s[3], colour: s[4], rent: s[5], owner, favourites: s[7], photos,
      deposit, condition: CONDITION_TITLES[CONDITIONS[i]], details, order: i,
      measurements: MEASUREMENTS[i] ? { chest: MEASUREMENTS[i][0], waist: MEASUREMENTS[i][1], hips: MEASUREMENTS[i][2], length: MEASUREMENTS[i][3] } : null,
    };
  });

  // --- Colour families and backdrops (Palette.Backdrop) ---

  const FAMILIES = {
    neutral: ["white", "ivory", "cream", "beige", "camel", "stone", "ecru", "nude", "tan", "brown", "sand", "oatmeal"],
    dark: ["black", "charcoal", "grey", "gray"],
    red: ["red", "burgundy", "wine", "maroon", "scarlet", "crimson"],
    pink: ["pink", "coral", "blush", "rose", "fuchsia", "magenta"],
    purple: ["lilac", "purple", "lavender", "plum", "violet", "mauve"],
    blue: ["blue", "navy", "teal", "turquoise", "denim", "cobalt", "sky"],
    green: ["green", "olive", "khaki", "mint", "sage", "emerald", "forest"],
    yellow: ["yellow", "mustard", "orange", "lemon"],
    metallic: ["silver", "gold", "bronze", "metallic"],
  };
  function family(colour) {
    for (const word of colour.toLowerCase().split(/[^a-z]+/)) {
      for (const [name, words] of Object.entries(FAMILIES)) if (words.includes(word)) return name;
    }
    return "other";
  }

  const BACKDROPS = {
    blush: ["#FCE6EF", "#F4C6D9", "#E59ABB"],
    lilac: ["#E9E2F7", "#CDBFEA", "#9D88CF"],
    sky: ["#DBE8F0", "#B9D1DF", "#7DA7BF"],
    mint: ["#DBF0E7", "#B9DFCE", "#7DBF9F"],
    peach: ["#F6E6DB", "#E8C9B6", "#CF9A7E"],
    rose: ["#F2DFF0", "#DFBADB", "#BF85B9"],
  };
  const CHOICES = {
    red: ["sky", "mint", "lilac"], pink: ["sky", "mint", "lilac"], purple: ["mint", "peach", "sky"],
    blue: ["peach", "blush", "rose"], green: ["blush", "peach", "lilac"], yellow: ["sky", "lilac", "rose"],
    neutral: ["rose", "sky", "lilac", "mint"], dark: ["blush", "sky", "mint", "peach"], metallic: ["lilac", "sky", "rose"],
    other: ["blush", "lilac", "sky", "mint", "peach", "rose"],
  };
  /** The backdrop for a piece: never one in its own colour family, always the same for the same piece. */
  function backdrop(piece) {
    const choices = CHOICES[family(piece.colour)];
    let hash = 0;
    for (let i = 0; i < piece.title.length; i++) hash = (hash * 31 + piece.title.charCodeAt(i)) % 9973;
    return BACKDROPS[choices[hash % choices.length]];
  }
  function paintBackdrop(el, piece) {
    const [a, b, c] = backdrop(piece);
    el.style.setProperty("--bd1", a);
    el.style.setProperty("--bd2", b);
    el.style.setProperty("--bd3", c);
  }

  // --- Shop window (ShopWindow) ---

  const WINDOWS = [
    { title: "Evening", categories: ["gowns"] },
    { title: "Day dresses", categories: ["dresses"] },
    { title: "Knits & tops", categories: ["knitwear", "tops"] },
    { title: "Tailoring", categories: ["jackets", "bottoms"] },
    { title: "Bags", categories: ["bags"] },
  ];
  const byLove = (a, b) => b.favourites - a.favourites || a.title.localeCompare(b.title);
  const windowPieces = (w) => PIECES.filter((p) => w.categories.includes(p.category)).sort(byLove).slice(0, 8);

  function ukSize(size) { const m = /^\s*UK\s*(\d+)/i.exec(size); return m ? Number(m[1]) : null; }
  /** How well a jacket fits with a dress: 2 for the same UK size, 1 for one size apart, 0 for neither. */
  function fit(a, b) {
    const x = ukSize(a.size), y = ukSize(b.size);
    if (x === null || y === null) return 0;
    return Math.abs(x - y) === 0 ? 2 : Math.abs(x - y) === 2 ? 1 : 0;
  }
  const layersFor = (main) => PIECES.filter((p) => p.category === "jackets" && fit(main, p) > 0)
    .sort((a, b) => fit(main, b) - fit(main, a) || a.title.localeCompare(b.title));
  function bagsFor(main) {
    const quiet = ["neutral", "dark", "metallic", "yellow"];
    const ranked = PIECES.filter((p) => p.category === "bags")
      .sort((a, b) => (quiet.includes(family(b.colour)) - quiet.includes(family(a.colour))) || a.title.localeCompare(b.title));
    const others = ranked.filter((b) => family(b.colour) !== family(main.colour));
    return others.length ? others : ranked;
  }
  // --- Favourites: remembered in this browser only, if it lets us ---

  const saved = new Set();
  try { JSON.parse(localStorage.getItem("robeSaved") || "[]").forEach((id) => saved.add(id)); } catch (e) {}
  function toggleSaved(id) {
    if (saved.has(id)) saved.delete(id); else saved.add(id);
    try { localStorage.setItem("robeSaved", JSON.stringify([...saved])); } catch (e) {}
    document.querySelectorAll(`.heart[data-id="${id}"]`).forEach((h) => {
      h.setAttribute("aria-pressed", String(saved.has(id)));
      h.classList.remove("pop"); void h.offsetWidth; h.classList.add("pop");
    });
  }

  // --- Building blocks ---

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // What opening a piece does: the quick view on the landing page, its page in the shop.
  let openPiece = (piece, opener) => quickView(piece, opener);
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function img(src, className, alt) {
    const i = el("img", className);
    i.src = src; i.alt = alt || ""; i.loading = "lazy"; i.decoding = "async";
    return i;
  }
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.3 4.6 6.7 4.6c2.1 0 3.6 1.2 5.3 3.2 1.7-2 3.2-3.2 5.3-3.2 3.4 0 5.3 3.4 4 6.7-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';
  function heart(piece) {
    const b = el("button", "heart");
    b.type = "button";
    b.dataset.id = piece.id;
    b.innerHTML = HEART;
    b.setAttribute("aria-label", `Save ${piece.title}`);
    b.setAttribute("aria-pressed", String(saved.has(piece.id)));
    b.addEventListener("click", (e) => { e.stopPropagation(); toggleSaved(piece.id); });
    return b;
  }
  const label = (p) => `${p.title} by ${p.brand}, £${p.rent} for ten days, ${p.size}`;

  /**
   * A card for the grid: the cut-out on its backdrop, a heart, and the details.
   * Its photos swipe sideways right on the card (arrows on hover with a mouse),
   * without opening it; a click opens it.
   */
  function card(piece) {
    const c = el("article", "listing-card");
    c.dataset.category = piece.category;
    // Not a <button>: the photos inside it scroll.
    const open = el("div", "card-open");
    open.setAttribute("role", "button");
    open.tabIndex = 0;
    open.setAttribute("aria-label", label(piece));
    const photo = el("div", "card-photo");
    paintBackdrop(photo, piece);
    const strip = el("div", "photo-strip");
    piece.photos.forEach((src, i) => strip.appendChild(img(src, i ? "" : "photo-main")));
    photo.appendChild(strip);
    // How it should fit the reader, once they've told Robe their fit (fitfinder.js).
    const fits = window.RobeFitFinder && window.RobeFitFinder.badge(piece);
    if (fits) photo.appendChild(fits);
    if (piece.photos.length > 1) {
      const dots = el("span", "photo-dots");
      piece.photos.forEach(() => dots.appendChild(el("i")));
      dots.firstChild.classList.add("on");
      photo.appendChild(dots);
      let at = 0;
      strip.addEventListener("scroll", () => {
        const now = Math.round(strip.scrollLeft / Math.max(strip.clientWidth, 1));
        if (now === at) return;
        at = now;
        [...dots.children].forEach((d, i) => d.classList.toggle("on", i === at));
      }, { passive: true });
      for (const [dir, name, glyph] of [[-1, "Previous photo", "‹"], [1, "Next photo", "›"]]) {
        const step = el("button", `photo-step ${dir < 0 ? "prev" : "next"}`, glyph);
        step.type = "button";
        step.tabIndex = -1;
        step.setAttribute("aria-label", name);
        step.addEventListener("click", (e) => {
          e.stopPropagation();
          strip.scrollBy({ left: dir * strip.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
        });
        photo.appendChild(step);
      }
    }
    open.appendChild(photo);
    open.addEventListener("click", () => openPiece(piece, open));
    open.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPiece(piece, open); }
    });
    c.appendChild(open);
    c.appendChild(heart(piece));
    const body = el("div", "listing-body");
    body.appendChild(el("div", "piece-brand", piece.brand));
    body.appendChild(el("div", "title", piece.title));
    const meta = el("div", "meta");
    const price = el("span", "price", `£${piece.rent} `);
    price.appendChild(el("span", "", "/ 10 days"));
    meta.appendChild(price);
    meta.appendChild(el("span", "size", piece.size.replace(/ \/ .*/, "")));
    body.appendChild(meta);
    body.appendChild(el("div", "owner", piece.owner.shop ? `${piece.owner.name} · ${piece.owner.area}` : `From a wardrobe in ${piece.owner.area}`));
    c.appendChild(body);
    return c;
  }

  // --- Quick view: every photo of a piece, and its details ---

  let dialog, lastOpener;
  function quickView(piece, opener) {
    if (!dialog || typeof dialog.showModal !== "function") return;
    lastOpener = opener;
    const stage = dialog.querySelector(".qv-photo");
    const thumbs = dialog.querySelector(".qv-thumbs");
    paintBackdrop(stage, piece);
    const show = (i) => {
      stage.replaceChildren(img(piece.photos[i], "", `${piece.title}, photo ${i + 1} of ${piece.photos.length}`));
      const count = el("span", "qv-count", `${i + 1} / ${piece.photos.length}`);
      stage.appendChild(count);
      thumbs.querySelectorAll("button").forEach((t, k) => t.setAttribute("aria-current", String(k === i)));
    };
    thumbs.replaceChildren(...piece.photos.map((src, i) => {
      const t = el("button", "qv-thumb");
      t.type = "button";
      t.setAttribute("aria-label", `Show photo ${i + 1} of ${piece.photos.length}`);
      paintBackdrop(t, piece);
      t.appendChild(img(src));
      t.addEventListener("click", () => show(i));
      return t;
    }));
    show(0);
    dialog.querySelector(".qv-brand").textContent = piece.brand;
    dialog.querySelector(".qv-title").textContent = piece.title;
    dialog.querySelector(".qv-price").textContent = `£${piece.rent} for ten days`;
    dialog.querySelector(".qv-cta").href = `shop.html#/item/${piece.id}`;
    const fit = dialog.querySelector(".qv-fit");
    if (fit && window.RobeFitFinder) window.RobeFitFinder.mount(fit, piece);
    dialog.querySelector(".qv-facts").replaceChildren(
      ...[piece.size, piece.colour, piece.owner.shop ? `${piece.owner.name}, ${piece.owner.area}` : `A wardrobe in ${piece.owner.area}`]
        .map((t) => el("li", "", t)));
    const save = dialog.querySelector(".qv-save");
    save.replaceWith(Object.assign(heart(piece), { className: "heart qv-save" }));
    dialog.showModal();
  }
  function setUpDialog() {
    dialog = document.getElementById("quick-view");
    if (!dialog) return;
    dialog.querySelector(".qv-close").addEventListener("click", () => dialog.close());
    dialog.querySelector(".qv-cta").addEventListener("click", () => dialog.close());
    // A click on the dimmed page outside the card closes it.
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => { if (lastOpener) lastOpener.focus(); });
  }

  // --- The shop window ---

  function mountWindow(root) {
    if (!root.querySelector(".window-tabs")) {
      root.innerHTML = '<div class="window-tabs" role="tablist" aria-label="Corners of the shop"></div>'
        + '<div class="window-stage"><button class="window-prev" type="button" aria-label="Previous piece"><span aria-hidden="true">‹</span></button>'
        + '<div class="window-track" aria-label="The window"></div>'
        + '<button class="window-next" type="button" aria-label="Next piece"><span aria-hidden="true">›</span></button></div>'
        + '<div class="window-caption" aria-live="polite"></div><div class="window-dots" aria-hidden="true"></div>';
    }
    const tabs = root.querySelector(".window-tabs");
    const track = root.querySelector(".window-track");
    const caption = root.querySelector(".window-caption");
    const dots = root.querySelector(".window-dots");
    let pieces = [], items = [], current = -1, frame = 0;

    function place() {
      frame = 0;
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, bestDistance = Infinity;
      items.forEach((item, i) => {
        const centre = item.offsetLeft + item.offsetWidth / 2;
        const offset = (centre - mid) / item.offsetWidth;
        const reach = Math.min(Math.abs(offset), 1);
        const clamped = Math.max(-1, Math.min(1, offset));
        // WindowCarousel: smaller, turned towards the middle, faded, and pulled in behind it.
        const scale = 1 - 0.18 * reach;
        const tilt = reduceMotion ? 0 : -clamped * 24;
        const pull = -clamped * (0.09 + 0.08) * 100;
        item.style.transform = `translateX(${pull}%) scale(${scale}) rotateY(${tilt}deg)`;
        item.style.opacity = String(1 - 0.45 * reach);
        item.style.zIndex = String(100 - Math.round(reach * 10));
        const photo = item.querySelector("img");
        if (photo && !reduceMotion) photo.style.transform = `translateX(${-clamped * 10}%)`;
        if (Math.abs(offset) < bestDistance) { bestDistance = Math.abs(offset); best = i; }
      });
      if (best !== current) select(best);
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(place); };

    function select(i) {
      current = i;
      const p = pieces[i];
      items.forEach((item, k) => item.setAttribute("aria-current", String(k === i)));
      caption.replaceChildren(
        el("div", "piece-brand", p.brand),
        el("div", "title", p.title),
        Object.assign(el("div", "meta"), { textContent: `£${p.rent} / 10 days · ${p.size}` }),
      );
      caption.querySelector(".meta").appendChild(heart(p));
      dots.querySelectorAll("i").forEach((d, k) => d.classList.toggle("on", k === i));
    }

    function show(w) {
      pieces = windowPieces(w);
      tabs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b.textContent === w.title)));
      items = pieces.map((p, i) => {
        const item = el("button", "window-piece");
        item.type = "button";
        item.setAttribute("aria-label", label(p));
        paintBackdrop(item, p);
        item.appendChild(img(p.photos[0]));
        // The middle piece opens; a side one comes to the middle.
        item.addEventListener("click", () => {
          if (i === current) openPiece(p, item);
          else item.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
        });
        return item;
      });
      track.replaceChildren(...items);
      dots.replaceChildren(...pieces.map(() => el("i")));
      current = -1;
      track.scrollLeft = 0;
      requestAnimationFrame(place);
    }

    tabs.replaceChildren(...WINDOWS.map((w) => {
      const b = el("button", "chip", w.title);
      b.type = "button";
      b.setAttribute("role", "tab");
      b.addEventListener("click", () => show(w));
      return b;
    }));
    root.querySelector(".window-prev").addEventListener("click", () => items[Math.max(current - 1, 0)].click());
    root.querySelector(".window-next").addEventListener("click", () => items[Math.min(current + 1, items.length - 1)].click());
    track.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    show(WINDOWS[0]);
  }

  // --- Every piece, with filters ---

  function setUpGrid() {
    const grid = document.querySelector("#listings .listing-grid");
    const filters = document.getElementById("grid-filters");
    if (!grid || !filters) return;
    grid.replaceChildren(...PIECES.slice().sort(byLove).map(card));
    const options = [{ title: "All" }, ...WINDOWS, { title: "Saved", saved: true }];
    filters.replaceChildren(...options.map((o, i) => {
      const b = el("button", "chip", o.title);
      b.type = "button";
      b.setAttribute("aria-pressed", String(i === 0));
      b.addEventListener("click", () => {
        filters.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        grid.querySelectorAll(".listing-card").forEach((c) => {
          const id = c.querySelector(".heart").dataset.id;
          const show = o.saved ? saved.has(id) : !o.categories || o.categories.includes(c.dataset.category);
          c.hidden = !show;
        });
      });
      return b;
    }));
  }

  // The live storefront (storefront.js) and the web shop (shop.js) build from the same parts.
  window.RobeShowcase = {
    PIECES, WINDOWS, card, heart, label, el, img, paintBackdrop, mountWindow,
    layersFor, bagsFor, family, saved, toggleSaved, byLove, reduceMotion,
    setOpener(fn) { openPiece = fn; },
  };

  function start() {
    // The web shop mounts the parts itself, on its own pages.
    if (document.body.dataset.page === "shop") return;
    setUpDialog();
    const window_ = document.getElementById("shop-window");
    if (window_) mountWindow(window_);
    setUpGrid();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
