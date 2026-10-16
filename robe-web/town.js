// Robe Town, as in the apps (Town.kt / Town.swift): the illustrated city drawn
// by tools/make_town.py, where the premium shops are buildings. The drawing is
// shown as its rendered image (assets/town/town-day.webp, town-night.webp; the
// hand-drawn filters in the SVG are too heavy to redraw live), drawn with every
// door open onto its lit shop floor. Each door's two leaves are their own images
// laid over the doorway, closed. Tap a shop and the camera walks up to its door
// (a sharp close-up of the door takes over from the town as it nears), the
// leaves swing open, and the camera steps inside as the shop's colour washes in;
// then its shop opens.

(function () {
  "use strict";

  const W = 1200, H = 1000;
  // The walk in (Town.kt): up to the door, the door opening, the step inside.
  const APPROACH_MS = 800, OPEN_MS = 650, STEP_IN_MS = 420;
  const DOOR_FILL = 0.42, STEP_IN = 1.8, DOOR_SWING = 78;
  const CLOSEUP = [200, 220], LEAF_MARGIN = 4;
  // The images' version, so a browser never keeps an old drawing.
  const V = "?v=4";
  const SHOPS = {
    harrods: { name: "Harrods", owner: "Harrods", tagline: "Knightsbridge · London", rect: [24, 432, 444, 438], door: [128, 798, 44, 64], wash: "#F6F1E4",
      about: "Occasionwear and tailoring from the Harrods rental edit. Every piece is checked in and pressed by Harrods before it's sent." },
    zara: { name: "Zara", owner: "Zara", tagline: "New collection", rect: [488, 556, 248, 314], door: [592, 802, 40, 60], wash: "#FFFFFF",
      about: "Rent this season's pieces from Zara. Clean lines, sharp tailoring, returned straight to the store." },
    selfridges: { name: "Selfridges", owner: "Selfridges", tagline: "Oxford Street · London", rect: [756, 520, 420, 350], door: [950, 800, 60, 62], wash: "#FFFBE6",
      about: "Statement pieces from the Selfridges rental edit, from the store of the yellow bags. Checked, steamed and wrapped in yellow before they're sent." },
  };
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const night = () => document.documentElement.dataset.theme === "dark";
  const SVGNS = "http://www.w3.org/2000/svg";
  /** An SVG of the whole town (its image), to add doors to or crop. */
  function townSvg(isNight) {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const image = document.createElementNS(SVGNS, "image");
    Object.entries({ href: `assets/town/town-${isNight ? "night" : "day"}.webp${V}`, x: 0, y: 0, width: W, height: H }).forEach(([k, v]) => image.setAttribute(k, v));
    svg.appendChild(image);
    return svg;
  }
  /** A shop page's header: the whole building and a little street, 3 : 2, inside the town (make_town.py's building_view). */
  function buildingView(key) {
    const [x, y, w, h] = SHOPS[key].rect;
    const m = 26;
    const vw = Math.max(w + 2 * m, (h + 2 * m) * 1.5), vh = vw / 1.5;
    const vx = Math.min(Math.max(x + w / 2 - vw / 2, 0), W - vw);
    const vy = Math.min(Math.max(y + h / 2 - vh / 2, 0), H - vh);
    return [vx, vy, vw, vh];
  }

  /** The close-up image's place around a shop's door: centred on it, inside the town. */
  function closeup(key) {
    const [x, y, w, h] = SHOPS[key].door;
    return [Math.min(Math.max(x + w / 2 - CLOSEUP[0] / 2, 0), W - CLOSEUP[0]), Math.min(Math.max(y + h / 2 - CLOSEUP[1] / 2, 0), H - CLOSEUP[1]), CLOSEUP[0], CLOSEUP[1]];
  }
  /** A door leaf's image (side 0 left, 1 right): the leaf and LEAF_MARGIN around it. */
  function leafBox(key, side) {
    const [x, y, w, h] = SHOPS[key].door;
    return [x + side * w / 2 - LEAF_MARGIN, y - LEAF_MARGIN, w / 2 + 2 * LEAF_MARGIN, h + 2 * LEAF_MARGIN];
  }
  function svgImage(href, [x, y, width, height]) {
    const image = document.createElementNS(SVGNS, "image");
    Object.entries({ href, x, y, width, height, preserveAspectRatio: "none" }).forEach(([k, v]) => image.setAttribute(k, v));
    return image;
  }
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;
  /** Runs `frame(e)` with eased progress e over `ms`, then resolves. */
  function tween(ms, ease, frame) {
    return new Promise((resolve) => {
      const start = performance.now();
      (function step(now) {
        const t = Math.min(1, (now - start) / ms);
        frame(ease(t));
        if (t < 1) requestAnimationFrame(step); else resolve();
      })(start);
    });
  }
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /** The town, drawn into `root`. `onEnter(key)` runs once the camera has stepped into a shop. */
  function mount(root, onEnter) {
    root.classList.add("town");
    const frame = document.createElement("div");
    frame.className = "town-frame";
    root.replaceChildren(frame);
    let busy = false;
    function draw() {
      {
        const svg = townSvg(night());
        svg.setAttribute("class", "town-svg");
        svg.setAttribute("role", "group");
        svg.setAttribute("aria-label", "Robe Town: the shops on Robe");
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        // Where the door close-up goes while walking up to a door; then each shop's door, closed.
        const near = document.createElementNS(SVGNS, "g");
        near.setAttribute("class", "town-near");
        svg.appendChild(near);
        const time = night() ? "night" : "day";
        Object.keys(SHOPS).forEach((key) => {
          [0, 1].forEach((side) => {
            const leaf = svgImage(`assets/town/${key}-leaf-${side ? "r" : "l"}-${time}.webp${V}`, leafBox(key, side));
            leaf.setAttribute("class", `town-leaf town-leaf-${key}`);
            leaf.dataset.side = side;
            svg.appendChild(leaf);
          });
        });
        Object.entries(SHOPS).forEach(([key, shop]) => {
          const [x, y, w, h] = shop.rect;
          const a = document.createElementNS(SVGNS, "a");
          a.setAttribute("href", "#");
          a.setAttribute("class", "town-door");
          a.setAttribute("aria-label", `${shop.name}, ${shop.tagline}. Walk in.`);
          const hit = document.createElementNS(SVGNS, "rect");
          Object.entries({ x, y, width: w, height: h, rx: 14, fill: "transparent" }).forEach(([k, v]) => hit.setAttribute(k, v));
          a.appendChild(hit);
          // A pink pin bobbing over the shop.
          const pin = document.createElementNS(SVGNS, "g");
          pin.setAttribute("class", "town-pin");
          pin.setAttribute("transform", `translate(${x + w / 2} ${y - 6})`);
          pin.innerHTML = '<circle r="17" cy="-22" fill="#fff" stroke="#2A1822" stroke-width="2.5"/>'
            + '<path d="M0 -6 C-8 -16 -11 -20 -11 -25 a11 11 0 0 1 22 0 c0 5 -3 9 -11 19 Z" fill="#E83E8C" stroke="#2A1822" stroke-width="2"/>'
            + '<circle cy="-25" r="4" fill="#fff"/>';
          a.appendChild(pin);
          a.addEventListener("click", (e) => { e.preventDefault(); enter(svg, key); });
          svg.appendChild(a);
        });
        const wash = document.createElementNS(SVGNS, "rect");
        Object.entries({ x: 0, y: 0, width: W, height: H, class: "town-wash", opacity: 0 }).forEach(([k, v]) => wash.setAttribute(k, v));
        svg.appendChild(wash);
        frame.replaceChildren(svg);
      }
    }
    async function enter(svg, key) {
      if (busy) return;
      busy = true;
      const shop = SHOPS[key];
      const [dx, dy, dw, dh] = shop.door;
      const doorX = dx + dw / 2, doorY = dy + dh / 2;
      const wash = svg.querySelector(".town-wash");
      wash.setAttribute("fill", shop.wash);
      const done = () => {
        onEnter(key);
        // Back here, the camera has stepped out again and the doors are shut.
        setTimeout(() => {
          svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
          wash.setAttribute("opacity", 0);
          svg.querySelector(".town-near").replaceChildren();
          svg.querySelectorAll(".town-leaf").forEach((leaf) => leaf.removeAttribute("transform"));
          svg.classList.remove("walking");
          frame.classList.remove("walking");
          busy = false;
        }, 700);
      };
      if (reduceMotion) { done(); return; }
      svg.classList.add("walking");
      frame.classList.add("walking");
      // The sharp close-up around the door, over the town and under the doors.
      svg.querySelector(".town-near").replaceChildren(svgImage(`assets/town/${key}-door-${night() ? "night" : "day"}.webp${V}`, closeup(key)));
      const doorZoom = DOOR_FILL * H / dh;
      // The camera, zoomed `zoom` times about the door, the door `pan` of the way to the middle of the view.
      const camera = (zoom, pan) => {
        const w = W / zoom, h = H / zoom;
        const cx = doorX - (doorX - W / 2) * (1 - pan) / zoom, cy = doorY - (doorY - H / 2) * (1 - pan) / zoom;
        svg.setAttribute("viewBox", [cx - w / 2, cy - h / 2, w, h].map((v) => v.toFixed(2)).join(" "));
      };
      // Up to the door, evenly in scale.
      await tween(APPROACH_MS, easeInOut, (e) => camera(Math.pow(doorZoom, e), e));
      // The leaves swing in on their hinges (squeezed toward the hinge as they turn away).
      const leaves = [...svg.querySelectorAll(`.town-leaf-${key}`)];
      const opening = tween(OPEN_MS, easeOut, (e) => {
        const turn = Math.cos((e * DOOR_SWING * Math.PI) / 180);
        leaves.forEach((leaf) => {
          const hinge = leaf.dataset.side === "1" ? dx + dw : dx;
          leaf.setAttribute("transform", `translate(${hinge} 0) scale(${turn.toFixed(3)} 1) translate(${-hinge} 0)`);
        });
      });
      await wait(OPEN_MS * 0.55);
      // Then a step inside, as the shop's colour washes in.
      await tween(STEP_IN_MS, easeIn, (e) => {
        camera(doorZoom * Math.pow(STEP_IN, e), 1);
        wash.setAttribute("opacity", e.toFixed(3));
      });
      await opening;
      done();
    }
    draw();
    // Day or night follows the page's theme.
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /** A shop's building in the town, for the top of its page. */
  function building(key) {
    const box = document.createElement("div");
    box.className = "town-building";
    const svg = townSvg(night());
    svg.setAttribute("viewBox", buildingView(key).join(" "));
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `The ${SHOPS[key].name} building`);
    box.appendChild(svg);
    return box;
  }

  window.RobeTown = { SHOPS, mount, building };
})();
