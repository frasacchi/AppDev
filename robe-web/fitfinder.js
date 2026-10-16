// Find my fit, as in the apps (FitFinder.kt / FitFinder.swift): whether a piece
// fits the reader, from whatever they've told Robe, the most telling first:
// something they own (fitcheck.js), their body against the body the piece's
// brand cuts its size for (brand-sizes.js), their body against the piece's
// measurements, then typical UK sizing. How rented pieces fitted nudges every
// answer; with their height, a hem says where it falls. Kept in this browser.

(function () {
  "use strict";
  const DATA = window.RobeBrandSizes;
  const FIT = window.RobeFit;
  if (!DATA || !FIT) return;

  const SAME_AROUND = 3, CLEAR_AROUND = 8, SAME_WIDTH = 1.5, CLEAR_WIDTH = 4;
  const FEEDBACK_STEP = 2, MAX_ADJUSTMENT = 6, FEEDBACK_WINDOW = 6;
  const TYPICAL = DATA.typical.brand;
  const BODY = {
    chest: ["Bust", "Around the fullest part, the tape level"],
    waist: ["Waist", "Around the narrowest part, above the belly button"],
    hips: ["Hips", "Around the widest part of your hips"],
    length: ["Height", "Standing straight, without shoes"],
  };
  const TITLES = { chest: "Chest", waist: "Waist", hips: "Hips", length: "Length" };
  const HEMS = {
    pastFloor: "Longer than you: one for heels", floor: "To the floor", ankle: "To the ankle", midi: "Mid-calf",
    knee: "At the knee", aboveKnee: "Above the knee", mini: "Mini", cropped: "Cropped", hip: "To the hip", belowHip: "Past the hip",
  };
  const FELT = { tooSmall: "Too small", right: "Just right", tooBig: "Too big" };

  // --- Charts ---
  const toChart = (c) => ({ brand: c.brand, aliases: c.aliases, source: c.source, rows: c.rows.map(([label, uk, bust, waist, hips]) => ({ label, uk, chest: bust, waist, hips })) });
  const CHARTS = DATA.charts.map(toChart);
  const TYPICAL_CHART = toChart(DATA.typical);
  const key = (name) => String(name).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
  const half = (cm) => Math.round(cm * 2) / 2;
  const fmt = (cm) => (cm % 1 === 0 ? String(cm) : cm.toFixed(1));
  function rowTitle(r) {
    if (r.label.startsWith("UK ")) return r.label;
    return r.uk.length === 1 ? `${r.label} (UK ${r.uk[0]})` : `${r.label} (UK ${r.uk[0]}–${r.uk[r.uk.length - 1]})`;
  }
  const row = (chart, label) => chart.rows.find((r) => key(r.label) === key(label)) || null;
  const rowForUk = (chart, uk) => chart.rows.find((r) => r.uk.includes(uk)) || null;
  function chart(brand) {
    const typed = key(brand || "");
    if (!typed) return null;
    const names = (c) => [c.brand, ...c.aliases].map(key);
    return CHARTS.find((c) => names(c).includes(typed)) || CHARTS.find((c) => names(c).some((n) => n.length >= 4 && typed.startsWith(n))) || null;
  }
  const named = (brand) => (brand === TYPICAL ? TYPICAL_CHART : CHARTS.find((c) => c.brand === brand) || null);
  function ukSize(size) {
    const m = /^UK (\d+)/.exec(String(size).trim());
    return m ? Number(m[1]) : null;
  }

  // --- The rules ---
  function ease(category, area) {
    if (category === "dresses") return area === "waist" ? 4 : 6;
    if (category === "gowns") return area === "waist" ? 3 : 4;
    if (category === "tops") return 10;
    if (category === "knitwear") return 8;
    if (category === "jackets") return 12;
    if (category === "bottoms") return area === "waist" ? 2 : 6;
    return 0;
  }
  const widths = (category) => FIT.areas(category).filter((a) => a !== "length");
  function cut(piece) {
    if (!FIT.areas(piece.category).length) return null;
    const uk = ukSize(piece.size);
    const c = chart(piece.brand);
    if (c) {
      const r = (piece.labelSize && row(c, piece.labelSize)) || (uk != null && rowForUk(c, uk));
      if (r) return { chart: c, row: r, typical: false };
    }
    const t = uk != null && rowForUk(TYPICAL_CHART, uk);
    return t ? { chart: TYPICAL_CHART, row: t, typical: true } : null;
  }
  const isTypical = (s) => s.brand === TYPICAL;
  const sizeTitle = (s) => (isTypical(s) ? `Usually ${s.label}` : `${s.label} at ${s.brand}`);
  const usualRow = (s) => { const c = named(s.brand); return c ? row(c, s.label) : null; };
  function body(profile) {
    const sizes = profile.sizes.filter(usualRow);
    const rows = sizes.map(usualRow);
    const fromSizes = (a) => (rows.length ? half(rows.reduce((t, r) => t + r[a], 0) / rows.length) : null);
    const typed = profile.body;
    const b = { chest: typed.chest ?? fromSizes("chest"), waist: typed.waist ?? fromSizes("waist"), hips: typed.hips ?? fromSizes("hips"), height: typed.height ?? null };
    const typedWidths = typed.chest != null || typed.waist != null || typed.hips != null;
    if (b.chest == null && b.waist == null && b.hips == null) return null;
    let basis;
    if (!sizes.length) basis = "your measurements";
    else if (typedWidths) basis = "your measurements and sizes";
    else if (sizes.length === 1) basis = isTypical(sizes[0]) ? `your usual ${sizes[0].label}` : `your ${sizes[0].label} at ${sizes[0].brand}`;
    else {
      const places = [...new Set(sizes.map((s) => (isTypical(s) ? "the high street" : s.brand)))];
      basis = "your sizes at " + (places.length === 1 ? places[0] : places.slice(0, -1).join(", ") + " and " + places[places.length - 1]);
    }
    return { body: b, basis };
  }
  function adjustment(feedback) {
    const latest = feedback.slice(-FEEDBACK_WINDOW);
    const net = latest.filter((f) => f.felt === "tooSmall").length - latest.filter((f) => f.felt === "tooBig").length;
    return Math.min(Math.max(net * FEEDBACK_STEP, -MAX_ADJUSTMENT), MAX_ADJUSTMENT);
  }
  function feelAround(d) {
    if (d < -CLEAR_AROUND) return "tight";
    if (d < -SAME_AROUND) return "snug";
    if (d > CLEAR_AROUND) return "roomy";
    if (d > SAME_AROUND) return "loose";
    return "same";
  }
  function feelFlat(d) {
    if (d < -CLEAR_WIDTH) return "tight";
    if (d < -SAME_WIDTH) return "snug";
    if (d > CLEAR_WIDTH) return "roomy";
    if (d > SAME_WIDTH) return "loose";
    return "same";
  }
  function label(feel, d) {
    const cm = Math.round(Math.abs(d));
    if (feel === "same") return "Right for you";
    if (feel === "tight" || feel === "snug") return `${cm} cm tighter`;
    return `${cm} cm roomier`;
  }
  function verdict(feels) {
    if (!feels.length) return null;
    if (feels.includes("tight")) return "tooSmall";
    if (feels.includes("snug")) return "snug";
    if (feels.includes("roomy")) return "roomy";
    if (feels.includes("loose")) return "roomier";
    return "likeYours";
  }
  function cutLines(category, r, b, extra) {
    return widths(category).filter((a) => b[a] != null).map((a) => {
      const yours = b[a] + extra, d = r[a] - yours, feel = feelAround(d);
      return { area: a, theirs: r[a], yours, feel, label: label(feel, d) };
    });
  }
  function comparable(theirs, mine) {
    const one = ["dresses", "gowns"], tops = ["knitwear", "tops", "jackets"];
    return theirs === mine || (one.includes(theirs) && one.includes(mine)) || (tops.includes(theirs) && tops.includes(mine));
  }

  /** Whether `piece` fits, from the profile and the reader's garments. Null when there's nothing to go on (or it's a bag). */
  function advise(piece, prof = profile, garments = FIT.garments) {
    if (!FIT.areas(piece.category).length) return null;
    const extra = adjustment(prof.feedback);
    const c = cut(piece);
    const you = body(prof);
    const lines = c && you ? cutLines(piece.category, c.row, you.body, extra) : [];
    const theirs = piece.measurements;
    const ref = FIT.bestReference(piece.category, garments.filter((g) => comparable(piece.category, g.category)));
    if (theirs && ref) {
      const mine = { ...ref.m };
      ["chest", "waist", "hips"].forEach((a) => { if (mine[a] != null) mine[a] += extra / 2; });
      const result = FIT.compare(theirs, mine);
      if (result && result.verdict) {
        const name = FIT.yours(ref.name);
        return { verdict: result.verdict, source: "garment", garment: ref, cut: c, cutLines: lines, adjustment: extra,
          basis: name[0].toLowerCase() + name.slice(1),
          lines: result.rows.map((r) => ({ area: r.area, theirs: theirs[r.area], yours: mine[r.area], feel: r.feel, label: r.label })) };
      }
    }
    if (!you) return null;
    const base = { cut: c, cutLines: lines, adjustment: extra, basis: you.basis };
    if (c && !c.typical) {
      const v = verdict(lines.map((l) => l.feel));
      if (v) return { ...base, verdict: v, source: "brandChart", lines };
    }
    if (theirs) {
      const measured = widths(piece.category).filter((a) => theirs[a] != null && you.body[a] != null).map((a) => {
        const need = half((you.body[a] + ease(piece.category, a) + extra) / 2), d = theirs[a] - need, feel = feelFlat(d);
        return { area: a, theirs: theirs[a], yours: need, feel, label: label(feel, d) };
      });
      const v = verdict(measured.map((l) => l.feel));
      if (v) return { ...base, verdict: v, source: "measured", lines: measured };
    }
    if (c) {
      const v = verdict(lines.map((l) => l.feel));
      if (v) return { ...base, verdict: v, source: "typicalChart", lines };
    }
    return null;
  }

  const AROUND_HEADLINES = { tooSmall: "Likely too small", snug: "A snug fit", likeYours: "Should fit you", roomier: "A little roomy", roomy: "Roomy on you" };
  const GARMENT_HEADLINES = { tooSmall: "Likely too small", snug: "A snug fit", likeYours: "Should fit like yours", roomier: "A little roomier than yours", roomy: "Roomier than yours" };
  const GARMENT_DETAILS = {
    tooSmall: "At least one area is more than 4 cm narrower than your garment.",
    snug: "Up to 4 cm narrower somewhere: fine if you like it close.",
    likeYours: "Every width is within 1.5 cm of your garment.",
    roomier: "Up to 4 cm wider somewhere, and nowhere narrower.",
    roomy: "More than 4 cm wider somewhere: a relaxed fit, or a size up.",
  };
  const headline = (a) => (a.source === "garment" ? GARMENT_HEADLINES : AROUND_HEADLINES)[a.verdict];
  function detail(a) {
    const going = `Going by ${a.basis}`;
    if (a.source === "garment") return GARMENT_DETAILS[a.verdict];
    if (a.source === "brandChart") return `${going}, against ${a.cut.chart.brand}'s own size chart.`;
    if (a.source === "measured") return `${going}, against this piece's measurements, with room to move.`;
    return `${going}, against typical UK sizing (we don't have this brand's chart yet).`;
  }
  const cutTitle = (c) => (c.typical ? `A typical ${c.row.label} is cut for` : `${c.chart.brand}'s ${c.row.label} is cut for`);
  function adjustmentNote(x) {
    const cm = Math.round(Math.abs(x));
    if (x > 0) return `Allowing ${cm} cm more room: you said pieces felt small.`;
    if (x < 0) return `Allowing ${cm} cm less room: you said pieces felt big.`;
    return null;
  }
  const BADGES = { tooSmall: "Too small", snug: "Snug", likeYours: "Fits you", roomier: "A bit roomy", roomy: "Roomy" };
  const fitsMe = (v) => v === "likeYours" || v === "snug" || v === "roomier";
  const RANKS = { likeYours: 0, roomier: 1, snug: 2, roomy: 4, tooSmall: 5 };
  const rank = (v) => (v in RANKS ? RANKS[v] : 3);
  function hemline(category, length, height) {
    if (!(height > 0) || category === "bags") return null;
    if (category === "tops" || category === "knitwear" || category === "jackets") {
      const f = (0.82 * height - length) / height;
      return f >= 0.6 ? "cropped" : f >= 0.43 ? "hip" : "belowHip";
    }
    const f = ((category === "bottoms" ? 0.62 : 0.82) * height - length) / height;
    if (f < -0.01) return "pastFloor";
    if (f < 0.015) return "floor";
    if (f < 0.07) return "ankle";
    if (f < 0.22) return "midi";
    if (f < 0.33) return "knee";
    if (f < 0.42) return "aboveKnee";
    return "mini";
  }

  // --- Kept in this browser ---
  const EMPTY = () => ({ body: {}, sizes: [], feedback: [] });
  function load() {
    try {
      const p = JSON.parse(localStorage.getItem("robeFitProfile"));
      return p ? { body: p.body || {}, sizes: p.sizes || [], feedback: p.feedback || [] } : EMPTY();
    } catch (e) { return EMPTY(); }
  }
  let profile = load();
  const listeners = new Set();
  function update(next) {
    profile = next;
    try { localStorage.setItem("robeFitProfile", JSON.stringify(profile)); } catch (e) {}
    listeners.forEach((fn) => fn());
  }
  const profileEmpty = () => !Object.values(profile.body).some((v) => v != null) && !profile.sizes.length;
  const knowsFit = () => !profileEmpty() || FIT.garments.length > 0;
  function record(pieceId, felt) {
    const id = `web-${pieceId}`;
    update({ ...profile, feedback: profile.feedback.filter((f) => f.rentalId !== id).concat({ rentalId: id, listingId: String(pieceId), felt }) });
  }
  /** Redraws `draw` whenever the profile or garments change, until `root` leaves the page. */
  function watch(root, draw) {
    let off = null;
    const fn = () => { if (root.isConnected) draw(); else { listeners.delete(fn); if (off) off(); } };
    listeners.add(fn);
    off = FIT.onChange(fn);
  }

  // --- Drawing ---
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(cls, text, onClick) { const b = el("button", cls, text); b.type = "button"; b.addEventListener("click", onClick); return b; }

  /** On a grid card's photo: how the piece should fit the reader, once they've told Robe their fit. */
  function badge(piece) {
    if (!knowsFit()) return null;
    const a = advise(piece);
    if (!a) return null;
    const b = el("span", `fit-badge fit-badge-${a.verdict}`, BADGES[a.verdict]);
    b.setAttribute("aria-label", `Fit: ${BADGES[a.verdict]}`);
    return b;
  }

  function lineRow(l, source) {
    const li = el("li");
    const left = el("div");
    const around = source === "brandChart" || source === "typicalChart";
    const numbers = source === "garment" ? `${fmt(l.theirs)} cm · yours ${fmt(l.yours)} cm`
      : source === "measured" ? `${fmt(l.theirs)} cm across · you need about ${fmt(l.yours)}`
      : `Cut for ${fmt(l.theirs)} cm · you ${fmt(l.yours)} cm`;
    left.append(el("strong", "", around ? BODY[l.area][0] : TITLES[l.area]), el("small", "", numbers));
    li.append(left, el("span", `fit-chip fit-${l.feel}`, l.label));
    return li;
  }

  const WAYS = {
    sizes: { title: "The size I wear", pitch: "Pick a shop you know and the size you buy there.", time: "10 seconds", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8L3 12z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="8" r="1.6" fill="currentColor"/></svg>' },
    measurements: { title: "My measurements", pitch: "Your bust, waist and hips, with a tape measure.", time: "2 minutes", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="8" width="20" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 8v4M10 8v3M14 8v4M18 8v3" stroke="currentColor" stroke-width="1.6"/></svg>' },
    garment: { title: "Something I own", pitch: "A piece you love the fit of, measured laid flat.", time: "3 minutes", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7a2 2 0 1 1 2-2M12 7v2L3 16h18l-9-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>' },
  };
  const shopName = (brand) => (brand === TYPICAL ? "Any high street shop" : brand);

  /** What the reader has saved for a way, in a line, or null. */
  function savedFor(way) {
    if (way === "sizes") return profile.sizes.length ? profile.sizes.map(sizeTitle).join(", ") : null;
    if (way === "measurements") {
      const b = profile.body;
      const parts = [b.chest != null && `bust ${fmt(b.chest)}`, b.waist != null && `waist ${fmt(b.waist)}`, b.hips != null && `hips ${fmt(b.hips)}`, b.height != null && `${fmt(b.height)} tall`].filter(Boolean);
      if (!parts.length) return null;
      const line = parts.join(", ");
      return line[0].toUpperCase() + line.slice(1) + " cm";
    }
    return FIT.garments.length ? FIT.garments.map((g) => g.name).join(", ") : null;
  }

  function oneIsEnough() { return el("p", "fit-enough", "Any one of these is enough"); }

  /** The three ways as big cards: what each needs, how long it takes, and what's saved. */
  function ways(onPick) {
    const list = el("div", "fit-ways");
    const anySaved = Object.keys(WAYS).some((w) => savedFor(w));
    Object.entries(WAYS).forEach(([key, w]) => {
      const saved = savedFor(key);
      const card = button(`fit-way${saved ? " saved" : ""}`, null, () => onPick(key));
      const icon = el("span", "fit-way-icon");
      icon.innerHTML = w.icon; // A fixed icon from WAYS.
      const text = el("span", "fit-way-text");
      text.append(el("strong", "", w.title), el("small", "", w.pitch),
        el("em", saved ? "fit-way-saved" : "", saved ? `✓ ${saved}` : anySaved ? "Optional: another way to check" : `About ${w.time}`));
      card.append(icon, text, el("span", "fit-way-go", "›"));
      list.appendChild(card);
    });
    return list;
  }

  function sizesPage() {
    const page = el("div", "fit-page");
    let shop = null;
    function draw() {
      const parts = [el("p", "fit-hint", "The size you usually buy at a shop you know. Robe works out the body that size is cut for, and checks every piece against its own brand's size chart.")];
      if (profile.sizes.length) {
        parts.push(el("small", "fit-with", "Your sizes"));
        const mine = el("div", "fit-garments");
        profile.sizes.forEach((s) => {
          const b = button("chip fit-size", `${sizeTitle(s)} ×`, () => update({ ...profile, sizes: profile.sizes.filter((x) => x !== s) }));
          b.setAttribute("aria-label", `Remove ${sizeTitle(s)}`);
          mine.appendChild(b);
        });
        parts.push(mine);
      }
      // The shop, from a menu.
      const label = el("label", "fit-select");
      label.appendChild(el("span", "", profile.sizes.length ? "Add another shop" : "Shop"));
      const select = el("select");
      const blank = el("option", "", "Choose a shop");
      blank.value = "";
      select.appendChild(blank);
      CHARTS.map((c) => c.brand).concat(TYPICAL).forEach((b) => {
        const o = el("option", "", shopName(b) + (profile.sizes.some((s) => s.brand === b) ? " ✓" : ""));
        o.value = b;
        o.selected = b === shop;
        select.appendChild(o);
      });
      select.addEventListener("change", () => { shop = select.value || null; draw(); });
      label.appendChild(select);
      parts.push(label);
      const chart = shop && named(shop);
      if (chart) {
        const saved = profile.sizes.find((s) => s.brand === chart.brand);
        parts.push(el("small", "fit-with", `Your size at ${shopName(chart.brand)}`));
        const chips = el("div", "fit-garments");
        chart.rows.forEach((r) => {
          const b = button("chip", rowTitle(r), () => update({ ...profile, sizes: profile.sizes.filter((s) => s.brand !== chart.brand).concat({ brand: chart.brand, label: r.label }) }));
          b.setAttribute("aria-pressed", String(!!saved && saved.label === r.label));
          chips.appendChild(b);
        });
        parts.push(chips);
        const r = saved && row(chart, saved.label);
        if (r) parts.push(el("p", "fit-note", `${chart.brand === TYPICAL ? `A typical ${r.label}` : `${chart.brand}'s ${r.label}`} is cut for a ${fmt(r.chest)} cm bust, ${fmt(r.waist)} cm waist and ${fmt(r.hips)} cm hips. That's you, as far as Robe can tell.`));
      }
      page.replaceChildren(...parts);
    }
    watch(page, draw);
    draw();
    return page;
  }

  function measurementsPage() {
    const page = el("div", "fit-page");
    page.appendChild(el("p", "fit-hint", "Measure over light clothes, the tape snug but not tight. Fill in what you know; the height says where hems fall on you."));
    const row = el("div", "fit-measure");
    let drawing = FIT.figure(null, "body", null);
    const redraw = (a) => { const next = FIT.figure(null, "body", a); drawing.replaceWith(next); drawing = next; };
    const form = el("form", "fit-editor");
    form.noValidate = true;
    const inputs = {};
    ["chest", "waist", "hips", "length"].forEach((a) => {
      const l = el("label", "", `${BODY[a][0]} (cm)`);
      const i = el("input");
      const stored = a === "length" ? profile.body.height : profile.body[a];
      Object.assign(i, { type: "text", inputMode: "decimal", value: stored != null ? fmt(stored) : "" });
      const how = el("small", "", BODY[a][1]);
      i.addEventListener("focus", () => redraw(a));
      inputs[a] = i;
      l.append(i, how);
      form.appendChild(l);
    });
    const error = el("p", "fit-error", "Measurements are numbers of centimetres.");
    error.hidden = true;
    const save = el("button", "qv-cta", "Save measurements");
    save.type = "submit";
    const parse = (t) => { const v = Number(String(t).trim().replace(",", ".")); return v > 0 && v < 400 ? v : null; };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = {};
      let ok = true;
      Object.entries(inputs).forEach(([a, i]) => { const p = i.value.trim() ? parse(i.value) : null; if (i.value.trim() && p == null) ok = false; v[a] = p; });
      if (!ok) { error.hidden = false; return; }
      error.hidden = true;
      update({ ...profile, body: { chest: v.chest, waist: v.waist, hips: v.hips, height: v.length } });
      save.textContent = "Saved ✓";
      setTimeout(() => { save.textContent = "Save measurements"; }, 1400);
    });
    form.append(error, save);
    row.append(drawing, form);
    page.appendChild(row);
    return page;
  }

  function garmentsPage() {
    const page = el("div", "fit-page");
    const list = el("div");
    FIT.mountGarments(list, true);
    page.append(
      el("p", "fit-hint", "Pick a piece you love the fit of. Robe compares every measured piece with it, area by area, and draws the two over each other."),
      FIT.fitStyles(),
      el("p", "fit-hint", "Slim, relaxed or oversized: the same body, more room each time. Measure the one you love, and Robe looks for that much room."),
      list,
    );
    return page;
  }

  function rentalsFitted() {
    if (!profile.feedback.length) return null;
    const box = el("div", "fit-rentals");
    const n = profile.feedback.length;
    box.append(el("strong", "", "How rentals fitted"),
      el("p", "fit-hint", (n === 1 ? "You've told Robe how 1 piece fitted. " : `You've told Robe how ${n} pieces fitted. `)
        + (adjustmentNote(adjustment(profile.feedback)) || "They fitted as Robe expected.")),
      button("chip", "Forget these answers", () => update({ ...profile, feedback: [] })));
    return box;
  }

  /** Find my fit in a dialog, on the three ways or straight on one. `done` runs when it closes. */
  function openFinder(way, done) {
    if (typeof way === "function") { done = way; way = null; }
    const dialog = el("dialog", "fit-dialog");
    dialog.setAttribute("aria-label", "Find my fit");
    const body = el("div", "fit-dialog-body");
    let at = typeof way === "string" ? way : null;
    function draw() {
      const head = el("div", "fit-dialog-head");
      if (at) head.appendChild(button("fit-back", "‹ All three ways", () => { at = null; draw(); }));
      else head.appendChild(el("h3", "fit-title", "Find my fit"));
      head.appendChild(button("fit-dialog-close", "Done", () => dialog.close()));
      if (!at) {
        const parts = [head, oneIsEnough(), ways((w) => { at = w; draw(); })];
        const r = rentalsFitted();
        if (r) parts.push(r);
        body.replaceChildren(...parts);
      } else {
        body.replaceChildren(head, el("h3", "fit-title", WAYS[at].title),
          at === "sizes" ? sizesPage() : at === "measurements" ? measurementsPage() : garmentsPage());
      }
    }
    dialog.appendChild(body);
    document.body.appendChild(dialog);
    draw();
    dialog.addEventListener("close", () => { dialog.remove(); if (typeof done === "function") done(); });
    dialog.showModal();
  }

  /** The fit card on a piece's page (and the landing page's quick view). Redraws itself when the fit changes. */
  function mount(root, piece) {
    if (!FIT.areas(piece.category).length) { root.replaceChildren(); return; }
    let chosen = null;
    function draw() {
      const pick = FIT.garments.find((g) => g.id === chosen);
      const a = pick ? advise(piece, profile, [pick]) : advise(piece);
      const c = cut(piece);
      if (!a) {
        // Stands out: a pink panel with the figure wearing this kind of piece.
        root.className = "fit-check fit-invite";
        const text = el("div", "fit-invite-text");
        text.append(el("h3", "fit-title", "Will it fit you?"),
          el("p", "fit-hint", "Tell Robe one thing about your fit, and every piece says whether it fits you."));
        if (c) text.appendChild(el("p", "fit-cut", `${cutTitle(c)} ` + widths(piece.category).map((x) => `${BODY[x][0].toLowerCase()} ${fmt(c.row[x])} cm`).join(", ") + "."));
        if (piece.measurements) text.appendChild(el("span", "fit-measured", "Measured"));
        text.appendChild(button("qv-cta fit-add", "Tell us your fit", () => openFinder(null)));
        const fig = FIT.figure(piece.category, "plain", null, 1, false);
        fig.setAttribute("aria-hidden", "true");
        root.replaceChildren(text, fig);
        return;
      }
      root.className = `fit-check fit-found fit-tint-${a.verdict}`;
      const head = el("div", "fit-head");
      head.appendChild(el("small", "fit-kicker", "Your fit"));
      if (piece.measurements) head.appendChild(el("span", "fit-measured", "Measured"));
      const parts = [head, el("p", `fit-verdict fit-v-${a.verdict}`, headline(a))];
      const basis = button("fit-basis", null, () => openFinder(null));
      basis.append(el("span", "", `Based on ${a.basis}`), el("b", "", " · Change"));
      parts.push(basis, el("p", "fit-hint", detail(a)));
      const note = adjustmentNote(a.adjustment);
      if (note) parts.push(el("p", "fit-note", note));
      const height = profile.body.height;
      const hem = piece.measurements && piece.measurements.length != null && height ? hemline(piece.category, piece.measurements.length, height) : null;
      if (hem) {
        const p = el("p", "fit-hem");
        p.append(el("span", "", "On you "), el("strong", "", HEMS[hem]), el("small", "", ` (${fmt(height)} cm tall)`));
        parts.push(p);
      }
      if (a.source === "garment" && piece.measurements) {
        parts.push(FIT.overlay(piece.measurements, piece.category, a.garment.m, a.garment.category));
        const legend = el("div", "fit-legend");
        legend.append(el("span", "fit-key-theirs", "This piece"), el("span", "fit-key-mine", FIT.yours(a.garment.name)));
        parts.push(legend);
      }
      const around = a.source === "brandChart" || a.source === "typicalChart";
      const heading = (x) => (x.typical ? `Typical ${x.row.label}: what it's cut for` : `How ${x.chart.brand} cuts its ${x.row.label}`);
      const table = (title, lines, source) => {
        const t = el("div", "fit-table-box");
        t.appendChild(el("strong", "", title));
        const ul = el("ul", "fit-rows");
        lines.forEach((l) => ul.appendChild(lineRow(l, source)));
        t.appendChild(ul);
        return t;
      };
      parts.push(table(around ? heading(a.cut) : "Measured against yours", a.lines, a.source));
      if (!around && a.cut && a.cutLines.length) parts.push(table(heading(a.cut), a.cutLines, "brandChart"));
      if (piece.measurements) {
        if (FIT.garments.length) {
          parts.push(el("small", "fit-with", "Compare with something you own"));
          const chips = el("div", "fit-garments");
          FIT.garments.forEach((g) => {
            const b = button("chip", g.name, () => { chosen = chosen === g.id ? null : g.id; draw(); });
            b.setAttribute("aria-pressed", String(a.garment && a.garment.id === g.id));
            chips.appendChild(b);
          });
          parts.push(chips);
        } else {
          parts.push(button("fit-link", "Compare with something I own ›", () => openFinder("garment")));
        }
      }
      // Worn it before? How it fitted nudges every answer.
      const worn = profile.feedback.find((f) => f.rentalId === `web-${piece.id}`);
      const ask = el("div", "fit-felt");
      ask.appendChild(el("small", "", worn ? "Thank you: Robe will remember how it fitted." : "Rented this before? How did it fit?"));
      const feltRow = el("div", "fit-garments");
      Object.entries(FELT).forEach(([k, v]) => {
        const b = button("chip", v, () => record(piece.id, k));
        b.setAttribute("aria-pressed", String(!!worn && worn.felt === k));
        feltRow.appendChild(b);
      });
      ask.appendChild(feltRow);
      parts.push(ask);
      root.replaceChildren(...parts);
    }
    watch(root, draw);
    draw();
  }

  /** Profile → Find my fit: the three ways, each opening the dialog at that way. */
  function mountProfile(root) {
    function draw() {
      root.className = "fit-check fit-profile";
      const parts = [el("h3", "fit-title", "Find my fit"), oneIsEnough(), ways((w) => openFinder(w))];
      const r = rentalsFitted();
      if (r) parts.push(r);
      root.replaceChildren(...parts);
    }
    watch(root, draw);
    draw();
  }

  window.RobeFitFinder = {
    chart, cut, body, advise, adjustment, feelAround, hemline, headline, detail, cutTitle, adjustmentNote,
    fitsMe, rank, badge, mount, mountProfile, openFinder, knowsFit,
    verdict: (piece) => { const a = advise(piece); return a ? a.verdict : null; },
    get profile() { return profile; },
    update,
  };
})();
