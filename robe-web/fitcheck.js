// Fit check, as in the apps (FitCheck.kt / FitCheck.swift): compare a piece
// with a garment the reader owns and knows fits them, both measured flat in
// centimetres. The garments are kept in this browser only.

(function () {
  "use strict";

  const SAME_WIDTH = 1.5, CLEAR_WIDTH = 4, SAME_LENGTH = 2;
  const AREAS = {
    chest: { title: "Chest", how: "Armpit to armpit, straight across", width: true },
    waist: { title: "Waist", how: "Straight across the narrowest part", width: true },
    hips: { title: "Hips", how: "Straight across the widest part, below the waist", width: true },
    length: { title: "Length", how: "From the top of the shoulder (or the waistband) to the hem", width: false },
  };
  const ORDER = ["chest", "waist", "hips", "length"];
  const KINDS = { dresses: "Dresses", gowns: "Gowns", knitwear: "Knitwear", jackets: "Jackets", tops: "Tops", bottoms: "Skirts & trousers" };
  const VERDICTS = {
    tooSmall: ["Likely too small", "At least one area is more than 4 cm narrower than your garment."],
    snug: ["A snug fit", "Up to 4 cm narrower somewhere: fine if you like it close."],
    likeYours: ["Should fit like yours", "Every width is within 1.5 cm of your garment."],
    roomier: ["A little roomier than yours", "Up to 4 cm wider somewhere, and nowhere narrower."],
    roomy: ["Roomier than yours", "More than 4 cm wider somewhere: a relaxed fit, or a size up."],
  };

  function areas(category) {
    if (category === "dresses" || category === "gowns") return ["chest", "waist", "hips", "length"];
    if (category === "knitwear" || category === "tops" || category === "jackets") return ["chest", "waist", "length"];
    if (category === "bottoms") return ["waist", "hips", "length"];
    return [];
  }
  function feel(area, d) {
    if (!AREAS[area].width) return d > SAME_LENGTH ? "longer" : d < -SAME_LENGTH ? "shorter" : "same";
    if (d < -CLEAR_WIDTH) return "tight";
    if (d < -SAME_WIDTH) return "snug";
    if (d > CLEAR_WIDTH) return "roomy";
    if (d > SAME_WIDTH) return "loose";
    return "same";
  }
  function label(area, d, f) {
    const cm = Math.round(Math.abs(d));
    if (f === "same") return AREAS[area].width ? "Same as yours" : "Same length";
    if (f === "shorter") return `${cm} cm shorter`;
    if (f === "longer") return `${cm} cm longer`;
    if (f === "tight" || f === "snug") return `${cm} cm narrower`;
    return `${cm} cm roomier`;
  }
  function compare(theirs, mine) {
    const rows = ORDER.filter((a) => theirs[a] != null && mine[a] != null)
      .map((a) => { const d = theirs[a] - mine[a]; const f = feel(a, d); return { area: a, d, feel: f, label: label(a, d, f) }; });
    if (!rows.length) return null;
    const feels = rows.filter((r) => AREAS[r.area].width).map((r) => r.feel);
    const verdict = !feels.length ? null : feels.includes("tight") ? "tooSmall" : feels.includes("snug") ? "snug"
      : feels.includes("roomy") ? "roomy" : feels.includes("loose") ? "roomier" : "likeYours";
    return { rows, verdict };
  }
  function bestReference(category, garments) {
    const onePiece = ["dresses", "gowns"], tops = ["knitwear", "tops", "jackets"];
    return garments.find((g) => g.category === category)
      || garments.find((g) => (onePiece.includes(category) && onePiece.includes(g.category)) || (tops.includes(category) && tops.includes(g.category)))
      || garments[0] || null;
  }
  function outline(m, category) {
    const chest = m.chest ?? (m.waist != null ? m.waist + 9 : m.hips != null ? m.hips - 4 : 45);
    const waist = m.waist ?? chest - 9;
    const hips = m.hips ?? waist + 13;
    if (category === "bottoms") {
      const L = m.length ?? 75;
      return [[0, waist / 2], [Math.min(20, L * 0.3), hips / 2], [L, hips * 0.56]];
    }
    if (category === "knitwear" || category === "tops" || category === "jackets") {
      const L = m.length ?? 65;
      return [[0, chest * 0.4], [Math.min(22, L * 0.35), chest / 2], [Math.min(40, L * 0.65), waist / 2], [L, waist * 0.53]];
    }
    const L = m.length ?? 110;
    return [[0, chest * 0.4], [22, chest / 2], [38, waist / 2], [58, hips / 2], [L, (hips / 2) * (L > 120 ? 1.3 : 1.12)]];
  }
  // "Your blue midi", or the name as it is when it already says whose it is ("My blue midi").
  const yours = (name) => (/^(my|mine)\b/i.test(name.trim()) ? name.trim() : `Your ${name.trim()}`);
  const fmt = (cm) => (cm % 1 === 0 ? String(cm) : cm.toFixed(1));
  const parse = (t) => { const v = Number(String(t).trim().replace(",", ".")); return v > 0 && v < 400 ? v : null; };

  // --- Kept in this browser ---
  function load() { try { return JSON.parse(localStorage.getItem("robeMyGarments")) || []; } catch (e) { return []; } }
  function keep(list) { try { localStorage.setItem("robeMyGarments", JSON.stringify(list)); } catch (e) {} }
  let garments = load();
  const listeners = new Set();
  function changed() { keep(garments); listeners.forEach((fn) => fn()); }
  function save(g) {
    const i = garments.findIndex((x) => x.id === g.id);
    if (i >= 0) garments[i] = g; else garments.push(g);
    changed();
  }
  function remove(id) { garments = garments.filter((g) => g.id !== id); changed(); }

  // --- Drawing ---
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  const SVG = "http://www.w3.org/2000/svg";
  function overlay(theirs, category, mine, myCategory) {
    const a = outline(theirs, category), b = outline(mine, myCategory);
    const W = 260, H = 230;
    const tallest = Math.max(a[a.length - 1][0], b[b.length - 1][0]);
    const widest = Math.max(...a.concat(b).map((p) => p[1]));
    const s = Math.min((H - 8) / tallest, (W / 2 - 8) / widest);
    const cx = W / 2;
    const d = (pts) => `M${cx} 4 ` + pts.map(([y, w]) => `L${(cx + w * s).toFixed(1)} ${(4 + y * s).toFixed(1)}`).join(" ")
      + " " + pts.slice().reverse().map(([y, w]) => `L${(cx - w * s).toFixed(1)} ${(4 + y * s).toFixed(1)}`).join(" ") + " Z";
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("class", "fit-overlay");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "This piece's outline drawn over your garment's");
    const guide = document.createElementNS(SVG, "line");
    Object.entries({ x1: 0, x2: W, y1: 4 + 38 * s, y2: 4 + 38 * s, class: "fit-guide" }).forEach(([k, v]) => guide.setAttribute(k, v));
    const theirsPath = document.createElementNS(SVG, "path");
    theirsPath.setAttribute("d", d(a));
    theirsPath.setAttribute("class", "fit-theirs");
    const minePath = document.createElementNS(SVG, "path");
    minePath.setAttribute("d", d(b));
    minePath.setAttribute("class", "fit-mine");
    svg.append(guide, theirsPath, minePath);
    return svg;
  }

  // --- The guides' figure, as in the apps (BodyFigure.kt / BodyFigure.swift): a body in thin
  // line art with the garment over it in soft pink, like a fashion size guide. A front view in a
  // 100 x 260 frame, x from the middle (mirror the right side), y down from the top of the head.
  const FIG = { headTop: 4, chin: 30, neck: 37, shoulder: 42, bust: 64, waist: 92, hip: 120, crotch: 136, knee: 186, ankle: 246, sole: 252, headY: 17, headRX: 9, headRY: 13 };
  const BODY_SIDE = [[4, 30], [4.5, 37], [19, 42], [17, 54], [15, 64], [12.5, 80], [11.5, 92], [14.5, 106], [17, 120], [16, 140], [13, 160], [11, 186], [10, 210], [8.5, 230], [7, 246], [9.5, 252]];
  const INNER_LEG = [[0, 136], [2.5, 160], [3.5, 186], [3, 215], [3, 246], [1.5, 252]];
  const ARM = [[19, 42], [23, 52], [25, 72], [26.5, 96], [27, 118], [25.5, 128], [22.5, 128], [21.5, 118], [20, 96], [18.5, 72], [17, 56]];
  function halfAt(points, y) {
    if (y <= points[0][1]) return points[0][0];
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1], [bx, by] = points[i];
      if (y <= by) return by === ay ? Math.max(ax, bx) : ax + (bx - ax) * (y - ay) / (by - ay);
    }
    return points[points.length - 1][0];
  }
  const DRESS_TOP = [[0, 40], [6, 37], [19.5, 42.5], [25.5, 57], [20.5, 60]];
  const DRESS_SIDE = [[20.5, 60], [17.5, 64], [14.5, 80], [13.5, 92], [17, 106], [19.5, 120], [20, 150]];
  /** The garment for a category over the body: { outline, side, top, hem }, `room` widening it; null for a bag. */
  function garmentShape(category, room = 1) {
    let g;
    if (category === "dresses") { const side = DRESS_SIDE.concat([[20.5, 186]]); g = { outline: DRESS_TOP.concat(side, [[0, 186]]), side, top: 37, hem: 186 }; }
    else if (category === "gowns") { const side = DRESS_SIDE.concat([[22.5, 200], [25, 246]]); g = { outline: DRESS_TOP.concat(side, [[0, 246]]), side, top: 37, hem: 246 }; }
    else if (category === "tops") { const side = [[20.5, 60], [17.5, 64], [15, 80], [14.5, 92], [17.5, 108], [19, 124]]; g = { outline: DRESS_TOP.concat(side, [[0, 124]]), side, top: 37, hem: 124 }; }
    else if (category === "knitwear") {
      const side = [[18, 64], [16, 80], [15.5, 92], [18, 108], [19.5, 124]];
      g = { outline: [[0, 40], [6, 37], [19.5, 42.5], [25.5, 60], [28.5, 122], [23.5, 124], [21, 64]].concat(side, [[0, 124]]), side, top: 37, hem: 124 };
    } else if (category === "jackets") {
      const side = [[19.5, 64], [17.5, 80], [17, 92], [19.5, 110], [21, 128]];
      g = { outline: [[0, 52], [7.5, 37], [21, 42], [27, 58], [29.5, 122], [24.5, 124], [22, 64]].concat(side, [[0, 128]]), side, top: 37, hem: 128 };
    } else if (category === "bottoms") { const side = [[13, 90], [13, 92], [17.5, 106], [19.5, 120], [21, 150], [23, 186]]; g = { outline: [[0, 90]].concat(side, [[0, 186]]), side, top: 90, hem: 186 }; }
    else return null;
    if (room === 1) return g;
    const wider = (p) => [p[0] * room, p[1]];
    return { ...g, outline: g.outline.map(wider), side: g.side.map(wider) };
  }
  const FIT_STYLES = [["Slim", 0.93], ["Relaxed", 1.1], ["Oversized", 1.32]];

  /**
   * The figure as an SVG: the body wearing `category`'s garment (none when null), with the tapes
   * of `mode` ("body": around the bust, waist and hips, and height; "garment": straight across it
   * laid flat, and its length; "plain": none). `highlight` is drawn in pink.
   */
  function figure(category, mode, highlight, room = 1, labels = true) {
    const show = labels && mode !== "plain";
    const left = show ? 56 : 2, right = show ? 44 : 2, W = left + 100 + right, H = 260;
    const cx = left + 50;
    const pt = (x, y) => `${(cx + x).toFixed(1)} ${y.toFixed(1)}`;
    const path = (points, flip, closed) => "M" + points.map(([x, y]) => pt(flip ? -x : x, y)).join(" L") + (closed ? " Z" : "");
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("class", `fit-figure fit-figure-${mode}`);
    svg.setAttribute("role", "img");
    const kind = category ? KINDS[category].toLowerCase() : "garment";
    svg.setAttribute("aria-label", mode === "body" ? "A body with a tape around the bust, waist and hips"
      : mode === "garment" ? `A ${kind} on a body, measured straight across, laid flat` : `A ${kind} on a body`);
    const add = (tag, attrs, text) => {
      const n = document.createElementNS(SVG, tag);
      Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
      if (text) n.textContent = text;
      svg.appendChild(n);
      return n;
    };
    const g = category ? garmentShape(category, room) : null;
    // The garment first, so the body's lines show through it, as in a size guide.
    if (g) add("path", { d: path(g.outline) + " L" + g.outline.slice().reverse().map(([x, y]) => pt(-x, y)).join(" L") + " Z", class: "fig-garment" });
    add("ellipse", { cx, cy: FIG.headY, rx: FIG.headRX, ry: FIG.headRY, class: "fig-body" });
    for (const flip of [false, true]) {
      add("path", { d: path(BODY_SIDE, flip), class: "fig-body" });
      add("path", { d: path(INNER_LEG, flip), class: "fig-body" });
      add("path", { d: path(ARM, flip, true), class: "fig-body" });
      add("path", { d: path([BODY_SIDE[BODY_SIDE.length - 1], INNER_LEG[INNER_LEG.length - 1]], flip), class: "fig-body" });
    }
    const arrow = (x1, y1, x2, y2, on) => add("line", { x1, y1, x2, y2, class: on ? "fig-tape on" : "fig-tape", "marker-start": "url(#fig-head)", "marker-end": "url(#fig-head)" });
    const label = (text, x, y, on, anchor) => { if (show) add("text", { x, y: y + 4, "text-anchor": anchor, class: on ? "fig-label on" : "fig-label" }, text); };
    const BODY_TITLES = { chest: "Bust", waist: "Waist", hips: "Hips" };
    if (mode === "body") {
      [["chest", FIG.bust], ["waist", FIG.waist], ["hips", FIG.hip]].forEach(([a, y]) => {
        const on = a === highlight, half = halfAt(BODY_SIDE, y) + 1.5;
        // Around the body: the front of the tape solid and dipping, the back dashed.
        add("path", { d: `M${pt(-half, y)} Q${pt(0, y + 4)} ${pt(half, y)}`, class: on ? "fig-tape on" : "fig-tape" });
        add("path", { d: `M${pt(-half, y)} Q${pt(0, y - 3)} ${pt(half, y)}`, class: on ? "fig-tape back on" : "fig-tape back" });
        label(BODY_TITLES[a], left - 6, y, on, "end");
      });
      const on = highlight === "length", x = cx + 32;
      arrow(x, FIG.headTop, x, FIG.sole, on);
      label("Height", x + 5, H / 2, on, "start");
    } else if (mode === "garment" && g) {
      const at = { chest: FIG.bust - 2, waist: FIG.waist, hips: FIG.hip };
      areas(category).filter((a) => a !== "length").forEach((a) => {
        const on = a === highlight, y = at[a], half = halfAt(g.side, y) - 2;
        arrow(cx - half, y, cx + half, y, on);
        label(AREAS[a].title, left - 6, y, on, "end");
      });
      if (areas(category).includes("length")) {
        const on = highlight === "length", x = cx + Math.max(...g.side.map((p) => p[0])) + 5;
        arrow(x, g.top, x, g.hem, on);
        label("Length", x + 5, (g.top + g.hem) / 2, on, "start");
      }
    }
    const defs = document.createElementNS(SVG, "defs");
    defs.innerHTML = '<marker id="fig-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1 L8 5 L2 9" fill="none" stroke="context-stroke" stroke-width="1.6"/></marker>';
    svg.prepend(defs);
    return svg;
  }

  /** Slim, relaxed, oversized: the same body with more room each time (after a fashion size guide). */
  function fitStyles() {
    const strip = el("div", "fit-styles");
    strip.setAttribute("role", "img");
    strip.setAttribute("aria-label", "Slim, relaxed and oversized: the same body with more room each time");
    FIT_STYLES.forEach(([name, room]) => {
      const c = el("figure");
      c.append(figure("dresses", "plain", null, room, false), el("figcaption", "", name));
      strip.appendChild(c);
    });
    return strip;
  }

  /** How to measure a piece laid flat, on a body, and why a garment measures more than the body inside it. */
  function measureGuide(category, highlight) {
    const box = el("div", "fit-guide");
    box.append(figure(category, "garment", highlight),
      el("p", "fit-hint", "Lay it flat and measure straight across: about half of all the way round. A garment measures more than the body inside it; that extra is the room to move."),
      fitStyles());
    return box;
  }


  /** The form for adding or editing a garment that fits the reader. */
  function editor(initial, category, done) {
    const form = el("form", "fit-editor");
    form.noValidate = true;
    form.appendChild(el("p", "fit-hint", "Pick a piece you love the fit of. Lay it flat, smooth it out, and measure straight across in centimetres."));
    const nameLabel = el("label", "", "What is it?");
    const name = el("input");
    Object.assign(name, { type: "text", placeholder: "My navy wedding-guest dress", value: initial ? initial.name : "", required: true });
    nameLabel.appendChild(name);
    const kindLabel = el("label", "", "Kind");
    const kind = el("select");
    Object.entries(KINDS).forEach(([k, v]) => { const o = el("option", "", v); o.value = k; o.selected = k === (initial ? initial.category : (KINDS[category] ? category : "dresses")); kind.appendChild(o); });
    kindLabel.appendChild(kind);
    const fields = el("div", "fit-fields");
    const inputs = {};
    let drawing = measureGuide(initial ? initial.category : (KINDS[category] ? category : "dresses"), null);
    const redrawGuide = (highlight) => { const next = measureGuide(kind.value, highlight); drawing.replaceWith(next); drawing = next; };
    function drawFields() {
      redrawGuide(null);
      fields.replaceChildren(...areas(kind.value).map((a) => {
        const l = el("label", "", `${AREAS[a].title} (cm)`);
        const i = el("input");
        Object.assign(i, { type: "text", inputMode: "decimal", value: inputs[a]?.value ?? (initial && initial.m[a] != null ? fmt(initial.m[a]) : "") });
        inputs[a] = i;
        i.addEventListener("focus", () => redrawGuide(a));
        l.append(i, el("small", "", AREAS[a].how));
        return l;
      }));
    }
    kind.addEventListener("change", drawFields);
    drawFields();
    const actions = el("div", "fit-actions");
    const saveBtn = el("button", "qv-cta", "Save");
    saveBtn.type = "submit";
    const cancel = el("button", "chip", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", () => done(null));
    actions.append(saveBtn, cancel);
    if (initial) {
      const del = el("button", "chip fit-delete", "Delete");
      del.type = "button";
      del.addEventListener("click", () => { remove(initial.id); done(null); });
      actions.appendChild(del);
    }
    const error = el("p", "fit-error", "Give it a name and at least one width (chest, waist or hips).");
    error.hidden = true;
    form.append(nameLabel, kindLabel, drawing, fields, error, actions);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const m = {};
      areas(kind.value).forEach((a) => { m[a] = parse(inputs[a].value); });
      const ok = name.value.trim() && areas(kind.value).some((a) => AREAS[a].width && m[a] != null);
      if (!ok) { error.hidden = false; return; }
      const g = { id: initial ? initial.id : String(Date.now()), name: name.value.trim(), category: kind.value, m };
      save(g);
      done(g);
    });
    setTimeout(() => name.focus(), 0);
    return form;
  }

  /** The fit check panel for a piece, drawn into `root`. Redraws itself when garments change. */
  function mount(root, piece) {
    if (!piece.measurements || !areas(piece.category).length) { root.replaceChildren(); return; }
    let chosen = null, mode = "view", editingGarment = null;
    function draw() {
      root.className = "fit-check";
      const head = el("h3", "fit-title", "Fit check");
      if (mode === "edit") {
        root.replaceChildren(head, editor(editingGarment, piece.category, (g) => { if (g) chosen = g.id; mode = "view"; editingGarment = null; draw(); }));
        return;
      }
      const ref = garments.find((g) => g.id === chosen) || bestReference(piece.category, garments);
      const result = ref ? compare(piece.measurements, ref.m) : null;
      const parts = [head];
      if (!ref || !result) {
        parts.push(el("p", "fit-hint", !ref
          ? "Compare this piece with something you own that fits you well. Measure it laid flat once, and every piece shows how it compares."
          : `${yours(ref.name)} doesn't share any measurements with this piece. Add one that does.`));
        const table = el("div", "fit-table");
        areas(piece.category).forEach((a) => {
          if (piece.measurements[a] == null) return;
          const c = el("div");
          c.append(el("small", "", AREAS[a].title), el("strong", "", `${fmt(piece.measurements[a])} cm`));
          table.appendChild(c);
        });
        const add = el("button", "qv-cta fit-add", "Add something that fits you");
        add.type = "button";
        add.addEventListener("click", () => { mode = "edit"; editingGarment = null; draw(); });
        parts.push(table, add);
      } else {
        if (result.verdict) parts.push(el("p", "fit-verdict", VERDICTS[result.verdict][0]), el("p", "fit-hint", VERDICTS[result.verdict][1]));
        parts.push(overlay(piece.measurements, piece.category, ref.m, ref.category));
        const legend = el("div", "fit-legend");
        legend.append(el("span", "fit-key-theirs", "This piece"), el("span", "fit-key-mine", yours(ref.name)));
        parts.push(legend);
        const rows = el("ul", "fit-rows");
        result.rows.forEach((r) => {
          const li = el("li");
          const left = el("div");
          left.append(el("strong", "", AREAS[r.area].title), el("small", "", `${fmt(piece.measurements[r.area])} cm · yours ${fmt(ref.m[r.area])} cm`));
          li.append(left, el("span", `fit-chip fit-${r.feel}`, r.label));
          rows.appendChild(li);
        });
        parts.push(rows, el("small", "fit-with", "Compared with (double-click to edit)"));
        const chips = el("div", "fit-garments");
        garments.forEach((g) => {
          const b = el("button", "chip", g.name);
          b.type = "button";
          b.setAttribute("aria-pressed", String(g.id === ref.id));
          b.addEventListener("click", () => { chosen = g.id; draw(); });
          b.addEventListener("dblclick", () => { mode = "edit"; editingGarment = g; draw(); });
          chips.appendChild(b);
        });
        const add = el("button", "chip", "+ Add");
        add.type = "button";
        add.addEventListener("click", () => { mode = "edit"; editingGarment = null; draw(); });
        const edit = el("button", "chip", "Edit");
        edit.type = "button";
        edit.addEventListener("click", () => { mode = "edit"; editingGarment = ref; draw(); });
        chips.append(add, edit);
        parts.push(chips);
      }
      root.replaceChildren(...parts);
    }
    // Redrawn when the garments change, until its page is gone.
    const onChange = () => { if (root.isConnected) draw(); else listeners.delete(onChange); };
    listeners.add(onChange);
    draw();
  }

  /** The reader's garments, to add to or edit (the shop's Profile; `embedded` inside Find my fit, without its own card and title). */
  function mountGarments(root, embedded) {
    let editing = undefined;
    function draw() {
      root.className = embedded ? "fit-embedded" : "fit-check";
      const parts = [el("p", "fit-hint", garments.length ? "Every piece compares with these." : "Add a garment that fits you well, and every piece shows how it compares.")];
      if (!embedded) parts.unshift(el("h3", "fit-title", "Fits you"));
      if (editing !== undefined) {
        parts.push(editor(editing, "dresses", () => { editing = undefined; draw(); }));
      } else {
        const list = el("ul", "fit-rows");
        garments.forEach((g) => {
          const li = el("li");
          const left = el("div");
          left.append(el("strong", "", g.name), el("small", "", `${KINDS[g.category]} · ` + areas(g.category).filter((a) => g.m[a] != null).map((a) => `${AREAS[a].title.toLowerCase()} ${fmt(g.m[a])}`).join(", ") + " cm"));
          const b = el("button", "chip", "Edit");
          b.type = "button";
          b.addEventListener("click", () => { editing = g; draw(); });
          li.append(left, b);
          list.appendChild(li);
        });
        const add = el("button", "chip", "+ Add a garment");
        add.type = "button";
        add.addEventListener("click", () => { editing = null; draw(); });
        parts.push(list, add);
      }
      root.replaceChildren(...parts);
    }
    // Redrawn when the garments change, until its page is gone.
    const onChange = () => { if (root.isConnected) draw(); else listeners.delete(onChange); };
    listeners.add(onChange);
    draw();
  }

  window.RobeFit = {
    areas, compare, yours, bestReference, outline, overlay, measureGuide, figure, fitStyles, mount, mountGarments,
    /** Calls `fn` whenever the garments change; returns a function that stops it. */
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    get garments() { return garments; },
  };
})();
