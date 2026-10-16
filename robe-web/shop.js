// The web shop, like Bounty's in-site shop: log in (the demo key while Robe is in
// testing) or get the app. Inside, the same pieces as the apps: Home with the shop
// window and Robe Town, Search with filters, each piece's page with its photos,
// Saved, the Bag and Profile, with a floating dock to move between them.
// Built from showcase.js's parts; the bag and the log-in are kept in this browser.

(function () {
  "use strict";

  const R = window.RobeShowcase;
  if (!R) return;
  const { PIECES, WINDOWS, el, img } = R;
  const byId = (id) => PIECES.find((p) => p.id === id);
  const BAG_CAPACITY = 6;

  // --- Kept in this browser, if it lets us ---

  function load(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (e) { return fallback; }
  }
  function keep(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  let bag = load("robeBag", []).filter(byId);
  let unlocked = load("robeShopUnlocked", false) === true;

  // --- The demo key (the apps' DemoAccess): letters and digits, upper case, by SHA-256 ---

  const KEY_HASHES = ["c117641d069c4199c5994ab992aba049c7fc1aa6200d46c273dc18a210688c60", "e6f21df78410965db30b1131879aa4a8db5a04a7dc3a8dcfc78867e3e460ae16"];
  const normalise = (text) => text.replace(/[^0-9a-z]/gi, "").toUpperCase();
  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    if (window.crypto && crypto.subtle) {
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return sha256Fallback(bytes);
  }
  // Where the page has no Web Crypto (opened from a file in some browsers).
  function sha256Fallback(bytes) {
    const K = [];
    for (let i = 0, n = 2; i < 64; n++) {
      let prime = true;
      for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
      if (prime) K[i++] = (Math.cbrt(n) % 1) * 2 ** 32 | 0;
    }
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const length = bytes.length;
    const padded = new Uint8Array(((length + 9 + 63) >> 6) << 6);
    padded.set(bytes);
    padded[length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 4, length * 8);
    view.setUint32(padded.length - 8, Math.floor(length / 2 ** 29));
    const w = new Array(64);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < padded.length; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
    }
    return H.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
  }

  // --- The gate ---

  const gate = document.getElementById("gate");
  const shop = document.getElementById("shop");
  function showGate() {
    shop.hidden = true;
    gate.hidden = false;
    document.title = "Robe — log in";
    document.getElementById("gate-key").focus();
  }
  function showShop() {
    gate.hidden = true;
    shop.hidden = false;
    route();
  }
  document.getElementById("gate-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const field = document.getElementById("gate-key");
    const error = document.getElementById("gate-error");
    const key = normalise(field.value);
    if (key && KEY_HASHES.includes(await sha256Hex(key))) {
      unlocked = true;
      keep("robeShopUnlocked", true);
      error.hidden = true;
      showShop();
      return;
    }
    error.hidden = false;
    field.setAttribute("aria-invalid", "true");
    const card = gate.querySelector(".gate-card");
    card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
  });
  document.getElementById("gate-key").addEventListener("input", (e) => {
    e.target.removeAttribute("aria-invalid");
    document.getElementById("gate-error").hidden = true;
  });

  // --- Small parts ---

  const main = document.getElementById("shop-main");
  const toastEl = document.getElementById("toast");
  let toastTimer = 0;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("on"), 2200);
  }
  function title(text, hint) {
    const box = el("div", "shop-title");
    box.appendChild(el("h2", "", text));
    if (hint) box.appendChild(el("p", "", hint));
    return box;
  }
  function grid(pieces) {
    const g = el("div", "listing-grid");
    g.replaceChildren(...pieces.map(R.card));
    return g;
  }
  function empty(text, link, linkText) {
    const box = el("div", "shop-empty");
    box.appendChild(el("p", "", text));
    if (link) { const a = el("a", "chip", linkText); a.href = link; box.appendChild(a); }
    return box;
  }
  function updateBagCount() {
    const count = document.getElementById("bag-count");
    count.textContent = String(bag.length);
    count.hidden = bag.length === 0;
  }

  /** Puts pieces in the bag; each photo flies from where it was to the dock's bag. */
  function addToBag(pieces, from) {
    let added = 0;
    for (const p of pieces) {
      if (bag.includes(p.id)) continue;
      if (bag.length >= BAG_CAPACITY) { toast(`Your bag is full: ${BAG_CAPACITY} pieces at most`); break; }
      bag.push(p.id);
      added++;
      fly(p, from);
    }
    keep("robeBag", bag);
    if (added) {
      toast(added === 1 ? `${pieces.length === 1 ? pieces[0].title : "1 piece"} is in your bag` : `${added} pieces are in your bag`);
      setTimeout(() => {
        updateBagCount();
        const icon = document.querySelector('.dock [data-tab="bag"]');
        icon.classList.remove("catch"); void icon.offsetWidth; icon.classList.add("catch");
      }, R.reduceMotion ? 0 : 520);
    } else if (pieces.every((p) => bag.includes(p.id))) {
      toast(pieces.length === 1 ? "Already in your bag" : "Already in your bag");
    }
  }
  function fly(piece, from) {
    if (R.reduceMotion || !from) return;
    const target = document.querySelector('.dock [data-tab="bag"]').getBoundingClientRect();
    const start = from.getBoundingClientRect();
    const ghost = img(piece.photos[0], "flight");
    ghost.loading = "eager";
    Object.assign(ghost.style, { left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px` });
    document.body.appendChild(ghost);
    const dx = target.left + target.width / 2 - (start.left + start.width / 2);
    const dy = target.top + target.height / 2 - (start.top + start.height / 2);
    ghost.animate([
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 80}px) scale(0.45) rotate(-12deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.08) rotate(-20deg)`, opacity: 0.6 },
    ], { duration: 560, easing: "cubic-bezier(0.3, 0.6, 0.4, 1)" }).finished.then(() => ghost.remove(), () => ghost.remove());
  }

  // --- Pages ---

  function home() {
    // Robe Town closes the page, running into its edges.
    const page = el("div", "shop-page shop-home");
    page.appendChild(title("The window", "Swipe through. Click the middle piece to look closer."));
    const win = el("div", "shop-window");
    page.appendChild(win);
    R.mountWindow(win);

    const all = el("a", "see-all");
    all.href = "#/search";
    all.innerHTML = `<span><strong>See all ${PIECES.length} pieces</strong><small>Every listing, with filters</small></span><span aria-hidden="true">→</span>`;
    page.appendChild(all);

    // The shops, as buildings in an illustrated town: tap one to walk in.
    if (window.RobeTown) {
      page.appendChild(title("Robe Town", "The shops on Robe. Tap a shop to walk in."));
      const town = el("div");
      page.appendChild(town);
      window.RobeTown.mount(town, (key) => { location.hash = `#/shop/${key}`; });
    }
    return page;
  }

  /** A premium shop's page: its building, its name and story, and its pieces. */
  function shopPage(key) {
    const shop = window.RobeTown && window.RobeTown.SHOPS[key];
    if (!shop) return empty("That shop isn't on Robe.", "#/", "Back home");
    document.title = `${shop.name} — Robe`;
    const page = el("div", `shop-page brand-page brand-${key}`);
    page.appendChild(window.RobeTown.building(key));
    const head = el("section", "brand-head");
    head.append(el("h1", "brand-name", shop.name), el("p", "brand-tagline", shop.tagline), el("p", "brand-about", shop.about));
    page.appendChild(head);
    const pieces = PIECES.filter((p) => p.owner.name === shop.owner).sort(R.byLove);
    page.appendChild(title(`${pieces.length} pieces to rent`));
    page.appendChild(grid(pieces));
    return page;
  }

  const SIZES = ["UK 6", "UK 8", "UK 10", "UK 12", "UK 14", "UK 16", "One size"];
  const SORTS = { loved: "Most loved", low: "Price: low to high", high: "Price: high to low", fit: "Best fit first" };

  function search(params) {
    const state = {
      q: params.get("q") || "",
      w: params.get("w") || "",
      shop: params.get("shop") || "",
      sizes: new Set((params.get("size") || "").split(",").filter(Boolean)),
      max: Number(params.get("max")) || 100,
      sort: SORTS[params.get("sort")] ? params.get("sort") : "loved",
      // Only what should fit the reader (Find my fit).
      fits: params.get("fits") === "1",
    };
    const F = window.RobeFitFinder;
    const page = el("div", "shop-page search-page");
    const filters = el("aside", "search-filters");
    const results = el("section", "search-results");
    const heading = el("div", "search-heading");
    const found = el("div", "listing-grid");
    results.append(heading, found);

    function sync() {
      // The address keeps the search, so it can be shared and Back works.
      const p = new URLSearchParams();
      if (state.q) p.set("q", state.q);
      if (state.w) p.set("w", state.w);
      if (state.shop) p.set("shop", state.shop);
      if (state.sizes.size) p.set("size", [...state.sizes].join(","));
      if (state.max < 100) p.set("max", String(state.max));
      if (state.sort !== "loved") p.set("sort", state.sort);
      if (state.fits) p.set("fits", "1");
      const hash = `#/search${p.toString() ? "?" + p : ""}`;
      if (location.hash !== hash) history.replaceState(null, "", hash);
      render();
    }
    function render() {
      const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      const w = WINDOWS.find((x) => x.title === state.w);
      let list = PIECES.filter((p) => {
        const text = `${p.title} ${p.brand} ${p.colour} ${p.category} ${p.owner.name}`.toLowerCase();
        return words.every((word) => text.includes(word))
          && (!w || w.categories.includes(p.category))
          && (!state.shop || p.owner.name === state.shop)
          && (!state.sizes.size || [...state.sizes].some((s) => p.size.startsWith(s)))
          && p.rent <= state.max
          && (!state.fits || !F || p.category === "bags" || F.fitsMe(F.verdict(p)));
      });
      const byFit = (a, b) => F.rank(F.verdict(a)) - F.rank(F.verdict(b)) || R.byLove(a, b);
      list = list.sort(state.sort === "low" ? (a, b) => a.rent - b.rent : state.sort === "high" ? (a, b) => b.rent - a.rent
        : state.sort === "fit" && F ? byFit : R.byLove);
      heading.replaceChildren(
        el("h2", "", state.q ? `“${state.q}”` : state.w || state.shop || "Everything"),
        el("p", "", list.length === 1 ? "1 piece" : `${list.length} pieces`),
      );
      found.replaceChildren(...(list.length ? list.map(R.card) : [empty("Nothing matches yet. Try fewer filters.", "#/search", "Clear filters")]));
      document.getElementById("shop-query").value = state.q;
    }

    function group(name, nodes) {
      const g = el("fieldset", "filter-group");
      g.appendChild(el("legend", "", name));
      const row = el("div", "filter-row");
      row.append(...nodes);
      g.appendChild(row);
      return g;
    }
    const windowChips = ["", ...WINDOWS.map((x) => x.title)].map((t) => {
      const b = el("button", "chip", t || "All");
      b.type = "button";
      b.setAttribute("aria-pressed", String(state.w === t));
      b.addEventListener("click", () => {
        state.w = t;
        windowChips.forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
        sync();
      });
      return b;
    });
    const sizeChips = SIZES.map((s) => {
      const b = el("button", "chip", s);
      b.type = "button";
      b.setAttribute("aria-pressed", String(state.sizes.has(s)));
      b.addEventListener("click", () => {
        if (state.sizes.has(s)) state.sizes.delete(s); else state.sizes.add(s);
        b.setAttribute("aria-pressed", String(state.sizes.has(s)));
        sync();
      });
      return b;
    });
    const priceLabel = el("output", "price-out", state.max >= 100 ? "Any price" : `Up to £${state.max}`);
    const price = el("input", "price-range");
    Object.assign(price, { type: "range", min: 10, max: 100, step: 5, value: String(state.max) });
    price.setAttribute("aria-label", "Most rent for ten days");
    price.addEventListener("input", () => {
      state.max = Number(price.value);
      priceLabel.textContent = state.max >= 100 ? "Any price" : `Up to £${state.max}`;
      sync();
    });
    const sort = el("select", "sort-select");
    sort.setAttribute("aria-label", "Sort");
    Object.entries(SORTS).forEach(([k, v]) => { const o = el("option", "", v); o.value = k; o.selected = k === state.sort; sort.appendChild(o); });
    sort.addEventListener("change", () => { state.sort = sort.value; sync(); });
    const fitsChip = el("button", "chip", "Fits me");
    fitsChip.type = "button";
    fitsChip.setAttribute("aria-pressed", String(state.fits));
    fitsChip.addEventListener("click", () => {
      const set = (on) => { state.fits = on; fitsChip.setAttribute("aria-pressed", String(on)); sync(); };
      // Before the reader has told Robe their fit: find it first.
      if (state.fits || !F || F.knowsFit()) set(!state.fits);
      else F.openFinder(() => { if (F.knowsFit()) set(true); });
    });
    filters.append(
      group("Show", windowChips),
      group("Fit", [fitsChip]),
      group("Size", sizeChips),
      group("Rent for ten days", [price, priceLabel]),
      group("Sort", [sort]),
    );
    if (state.shop) {
      const clear = el("button", "chip", `${state.shop} ×`);
      clear.type = "button";
      clear.setAttribute("aria-pressed", "true");
      clear.addEventListener("click", () => { state.shop = ""; clear.remove(); sync(); });
      filters.prepend(group("Shop", [clear]));
    }
    page.append(filters, results);
    render();
    return page;
  }

  function item(id) {
    const piece = byId(id);
    if (!piece) return empty("That piece isn't on Robe any more.", "#/search", "See everything");
    document.title = `${piece.title} — Robe`;
    const page = el("div", "shop-page item-page");
    const back = el("a", "item-back", "← Back");
    back.href = "#/search";
    back.addEventListener("click", (e) => { if (history.length > 1) { e.preventDefault(); history.back(); } });
    page.appendChild(back);

    const layout = el("div", "item-layout");
    const gallery = el("div", "item-gallery");
    const stage = el("div", "qv-photo item-photo");
    R.paintBackdrop(stage, piece);
    const thumbs = el("div", "qv-thumbs");
    let at = 0;
    function show(i) {
      at = (i + piece.photos.length) % piece.photos.length;
      stage.replaceChildren(img(piece.photos[at], "", `${piece.title}, photo ${at + 1} of ${piece.photos.length}`),
        el("span", "qv-count", `${at + 1} / ${piece.photos.length}`));
      thumbs.querySelectorAll("button").forEach((t, k) => t.setAttribute("aria-current", String(k === at)));
    }
    thumbs.append(...piece.photos.map((src, i) => {
      const t = el("button", "qv-thumb");
      t.type = "button";
      t.setAttribute("aria-label", `Show photo ${i + 1} of ${piece.photos.length}`);
      R.paintBackdrop(t, piece);
      t.appendChild(img(src));
      t.addEventListener("click", () => show(i));
      return t;
    }));
    // Left and right arrows step through the photos.
    stage.tabIndex = 0;
    stage.setAttribute("aria-label", "Photos: use the arrow keys");
    stage.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { show(at + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { show(at - 1); e.preventDefault(); }
    });
    gallery.append(stage, thumbs);
    show(0);

    const info = el("div", "item-info");
    info.appendChild(el("div", "piece-brand", piece.brand));
    info.appendChild(el("h1", "item-title", piece.title));
    const price = el("div", "item-price", `£${piece.rent} `);
    price.appendChild(el("span", "", "for ten days"));
    info.appendChild(price);
    const facts = el("ul", "qv-facts");
    [piece.size, piece.condition, piece.colour].forEach((t) => facts.appendChild(el("li", "", t)));
    info.appendChild(facts);
    info.appendChild(el("p", "item-details", piece.details));
    const owner = el("div", "item-owner");
    owner.appendChild(el("span", "item-avatar", piece.owner.name.split(" ").map((w) => w[0]).join("").slice(0, 2)));
    const who = el("div");
    who.appendChild(el("strong", "", piece.owner.name));
    who.appendChild(el("span", "", piece.owner.shop ? `Shop · ${piece.owner.area}` : `A wardrobe in ${piece.owner.area}`));
    owner.appendChild(who);
    info.appendChild(owner);
    const actions = el("div", "qv-actions");
    const add = el("button", "qv-cta", "Add to bag");
    add.type = "button";
    add.addEventListener("click", () => addToBag([piece], stage));
    actions.append(add, R.heart(piece));
    info.appendChild(actions);
    const deposit = el("p", "qv-note", `£${piece.deposit} deposit to protect the owner, held on your card and released once the piece is checked. Ten days from delivery.`);
    info.appendChild(deposit);
    // Your fit: this piece against what the reader wears (fitfinder.js).
    if (window.RobeFitFinder) {
      const fit = el("div");
      info.appendChild(fit);
      window.RobeFitFinder.mount(fit, piece);
    }
    layout.append(gallery, info);
    page.appendChild(layout);

    // Goes with: jackets that fit a dress, and bags in another colour (Looks).
    const goes = [];
    if (piece.category === "dresses" || piece.category === "gowns") goes.push(...R.layersFor(piece), ...R.bagsFor(piece).slice(0, 3));
    if (goes.length) {
      page.appendChild(title("Goes with", "A jacket that fits it and a bag in another colour."));
      page.appendChild(grid(goes));
    }
    const similar = PIECES.filter((p) => p.id !== piece.id && p.category === piece.category).sort(R.byLove).slice(0, 4);
    if (similar.length) {
      page.appendChild(title("Similar pieces"));
      page.appendChild(grid(similar));
    }
    return page;
  }

  function saved() {
    const page = el("div", "shop-page");
    page.appendChild(title("Saved", "The pieces you've hearted, in this browser."));
    const list = PIECES.filter((p) => R.saved.has(p.id));
    page.appendChild(list.length ? grid(list) : empty("Nothing saved yet. Tap the heart on anything you'd like to rent later.", "#/", "Shop the window"));
    return page;
  }

  function bagPage() {
    const page = el("div", "shop-page");
    page.appendChild(title("Your bag", `Up to ${BAG_CAPACITY} pieces, rented together.`));
    const pieces = bag.map(byId).filter(Boolean);
    if (!pieces.length) {
      page.appendChild(empty("Your bag is empty.", "#/", "Shop the window"));
      return page;
    }
    const layout = el("div", "bag-layout");
    const list = el("ul", "bag-list");
    pieces.forEach((p) => {
      const row = el("li", "bag-row");
      const photo = el("a", "bag-photo");
      photo.href = `#/item/${p.id}`;
      photo.setAttribute("aria-label", p.title);
      R.paintBackdrop(photo, p);
      photo.appendChild(img(p.photos[0]));
      const text = el("div", "bag-text");
      text.appendChild(el("div", "piece-brand", p.brand));
      text.appendChild(el("strong", "", p.title));
      text.appendChild(el("span", "", `${p.size} · £${p.rent} for ten days`));
      const remove = el("button", "bag-remove", "Remove");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${p.title}`);
      remove.addEventListener("click", () => {
        bag = bag.filter((id) => id !== p.id);
        keep("robeBag", bag);
        updateBagCount();
        route();
      });
      row.append(photo, text, remove);
      list.appendChild(row);
    });
    const rent = pieces.reduce((s, p) => s + p.rent, 0);
    const deposits = pieces.reduce((s, p) => s + p.deposit, 0);
    const summary = el("aside", "bag-summary");
    summary.innerHTML = `<h3>Summary</h3><dl><dt>Rent, ten days</dt><dd>£${rent}</dd><dt>Deposits held</dt><dd>£${deposits}</dd></dl>`
      + "<p>Deposits are held on your card, not charged, and released once each piece is back and checked.</p>";
    const checkout = el("a", "qv-cta", "Check out in the app");
    checkout.href = "index.html#download";
    summary.appendChild(checkout);
    summary.appendChild(el("p", "bag-note", "While Robe is in testing, payment, delivery and lockers are in the app. Your bag here is kept in this browser."));
    layout.append(list, summary);
    page.appendChild(layout);
    return page;
  }

  function profile() {
    const page = el("div", "shop-page");
    page.appendChild(title("Profile"));
    const card = el("section", "profile-card");
    card.innerHTML = '<div class="profile-kicker">Demo account</div><h3>Robe Rewards</h3>'
      + "<p>Every 3 rentals returned in good condition earn 50% off the rent of your next one.</p>";
    page.appendChild(card);
    const rows = el("div", "profile-rows");
    const counts = el("p", "", `${R.saved.size} saved · ${bag.length} in your bag`);
    const app = el("a", "chip", "Get the app");
    app.href = "index.html#download";
    const site = el("a", "chip", "About Robe");
    site.href = "index.html";
    const out = el("button", "chip", "Log out");
    out.type = "button";
    out.addEventListener("click", () => {
      unlocked = false;
      keep("robeShopUnlocked", false);
      location.hash = "#/";
      showGate();
    });
    rows.append(counts, app, site, out);
    page.appendChild(rows);
    if (window.RobeFitFinder) {
      const fit = el("section", "profile-fit");
      page.appendChild(fit);
      window.RobeFitFinder.mountProfile(fit);
    }
    return page;
  }

  // --- Routing ---

  let arriving = false;
  function route() {
    if (!unlocked) { showGate(); return; }
    const hash = location.hash.replace(/^#/, "") || "/";
    const [path, query] = hash.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = new URLSearchParams(query || "");
    document.title = "Robe — shop";
    let tab = "home", view;
    if (parts[0] === "search") { tab = "search"; view = search(params); }
    else if (parts[0] === "item") { tab = "search"; view = item(parts[1]); }
    else if (parts[0] === "shop") { tab = "home"; view = shopPage(parts[1]); }
    else if (parts[0] === "saved") { tab = "saved"; view = saved(); }
    else if (parts[0] === "bag") { tab = "bag"; view = bagPage(); }
    else if (parts[0] === "profile") { tab = "profile"; view = profile(); }
    else view = home();
    main.replaceChildren(view);
    if (arriving) {
      arriving = false;
      view.classList.add("rising");
    }
    document.querySelectorAll(".dock a").forEach((a) => {
      if (a.dataset.tab === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    updateBagCount();
    if (!parts.length || parts[0] !== "search") window.scrollTo(0, 0);
  }

  R.setOpener((piece) => { location.hash = `#/item/${piece.id}`; });
  window.addEventListener("hashchange", route);
  // Typed in the bar on any page. Entered on Home, Home turns into Search: the
  // shop sinks away under the bar, then the results rise in to meet it.
  document.getElementById("shop-search").addEventListener("submit", (e) => {
    e.preventDefault();
    const field = document.getElementById("shop-query");
    const q = field.value.trim();
    const target = q ? `#/search?q=${encodeURIComponent(q)}` : "#/search";
    const onHome = (location.hash.replace(/^#/, "") || "/") === "/";
    field.blur();
    if (!onHome || R.reduceMotion) { location.hash = target; return; }
    main.classList.add("sinking");
    setTimeout(() => {
      arriving = true;
      location.hash = target;
      main.classList.remove("sinking");
    }, 260);
  });
  // "/" jumps to the search field, as on Bounty.
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName) && !shop.hidden) {
      e.preventDefault();
      document.getElementById("shop-query").focus();
    }
  });
  // Light or dark: the reader's choice, kept in this browser.
  const toggle = document.querySelector(".theme-toggle");
  function paintToggle() {
    const dark = document.documentElement.dataset.theme === "dark";
    toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    toggle.firstElementChild.textContent = dark ? "☾" : "☀";
  }
  toggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("robeTheme", next); } catch (e) {}
    paintToggle();
  });
  paintToggle();

  if (unlocked) showShop(); else showGate();
})();
