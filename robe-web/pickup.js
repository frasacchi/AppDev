// Where the bag goes: InPost lockers and shops and Post Offices near a postcode or the reader,
// together on one map, as in the apps (PickupSpot): InPost yellow, Royal Mail red; a locker and a
// Post Office side by side share a two-colour pin, and the reader picks which to use. InPost's own
// point finder answers for InPost; OpenStreetMap (Overpass, then its place search when every
// Overpass server is busy) for Post Offices. The choice is kept in this browser.

(function () {
  "use strict";

  const RADIUS = 3000, SHARED_WITHIN = 30;
  const KINDS = {
    inPost: { title: "InPost locker", short: "InPost", pin: "#FFC72C", onPin: "#1C1C1C" },
    royalMail: { title: "Royal Mail / Post Office", short: "Royal Mail", pin: "#DA202A", onPin: "#FFFFFF" },
  };
  const OVERPASS = [
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  ];
  const LEAFLET = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/";

  // --- Finding places ---
  function distance(a, b) {
    const r = 6371000, toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  const withTimeout = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
  async function json(url, options = {}, ms = 15000) {
    const res = await fetch(url, { ...options, signal: withTimeout(ms) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function locate(postcode) {
    const q = encodeURIComponent(postcode.trim());
    try {
      const r = await json(`https://api.postcodes.io/postcodes/${q}`);
      return { lat: r.result.latitude, lon: r.result.longitude };
    } catch (e) {
      const places = await json(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=${q}`);
      if (!places.length) throw new Error("We couldn't find that postcode. Check it and try again.");
      return { lat: Number(places[0].lat), lon: Number(places[0].lon) };
    }
  }

  async function inPost(c) {
    const r = await json(`https://api-uk-points.easypack24.net/v1/points?relative_point=${c.lat},${c.lon}&max_distance=${RADIUS}&per_page=60`);
    return (r.items || []).filter((i) => i.status === "Operating" && i.location).map((i) => {
      const d = i.address_details || {};
      const street = d.street || "";
      const shop = (d.building_number || "").split(" - ").slice(1).join(" - ");
      return {
        id: `inPost/${i.name}`, kind: "inPost",
        name: (i.type || []).includes("parcel_locker") ? `InPost Locker${street ? `, ${street}` : ""}` : `${shop || "InPost shop"} (InPost shop)`,
        address: [street, d.post_code].filter(Boolean).join(", ") || "Location on map",
        lat: i.location.latitude, lon: i.location.longitude,
      };
    });
  }

  async function postOffices(c) {
    const query = `[out:json][timeout:20];nwr["amenity"="post_office"](around:${RADIUS},${c.lat},${c.lon});out center tags;`;
    for (const server of OVERPASS) {
      try {
        // A short wait each: when they're busy, they're slow.
        const r = await json(server, { method: "POST", body: "data=" + encodeURIComponent(query), headers: { "Content-Type": "application/x-www-form-urlencoded" } }, 7000);
        return (r.elements || []).map((e) => {
          const t = e.tags || {};
          return {
            id: `royalMail/${e.type}/${e.id}`, kind: "royalMail", name: t.name || "Post Office",
            address: [[t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "), t["addr:postcode"]].filter(Boolean).join(", ") || "Location on map",
            lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon,
          };
        });
      } catch (e) { /* the next server */ }
    }
    // Every Overpass server busy: OpenStreetMap's place search still knows Post Offices.
    const dLat = RADIUS / 111195, dLon = dLat / Math.cos((c.lat * Math.PI) / 180);
    const places = await json(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=40&bounded=1&q=post%20office&viewbox=${c.lon - dLon},${c.lat + dLat},${c.lon + dLon},${c.lat - dLat}`);
    return places.filter((p) => p.type === "post_office").map((p) => ({
      id: `royalMail/${p.osm_type}/${p.osm_id}`, kind: "royalMail", name: p.name || "Post Office",
      address: p.display_name.split(", ").slice(1, 4).join(", "), lat: Number(p.lat), lon: Number(p.lon),
    }));
  }

  /** `found` and `more` within 3 km of `c`, without repeats, nearest first. */
  function merged(c, found, more) {
    const all = [...found, ...more]
      .filter((p) => p.lat != null && p.lon != null)
      .map((p) => ({ ...p, distance: distance(c, p) }))
      .filter((p) => p.distance <= RADIUS);
    const seen = new Set();
    return all.filter((p) => !seen.has(p.id) && seen.add(p.id)).sort((x, y) => x.distance - y.distance);
  }

  /** As the apps' PickupSpot.group: a locker and a Post Office within 30 m share a spot. */
  function spots(list) {
    const out = [];
    list.forEach((p) => {
      const spot = out.find((s) => !s.some((q) => q.kind === p.kind) && distance(s[0], p) <= SHARED_WITHIN);
      if (spot) spot.push(p); else out.push([p]);
    });
    return out;
  }
  const distanceText = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);

  // --- Kept in this browser ---
  function saved() { try { return JSON.parse(localStorage.getItem("robePickup")); } catch (e) { return null; } }
  function keep(p) { try { localStorage.setItem("robePickup", JSON.stringify(p)); } catch (e) {} }

  // --- Leaflet, loaded only when a map is shown ---
  let leaflet = null;
  function loadLeaflet() {
    if (leaflet) return leaflet;
    leaflet = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET + "leaflet.min.css";
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = LEAFLET + "leaflet.min.js";
      js.onload = () => resolve(window.L);
      js.onerror = () => { leaflet = null; reject(new Error("The map couldn't load.")); };
      document.head.appendChild(js);
    });
    return leaflet;
  }

  // --- Drawing ---
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  const GLYPH = { inPost: "▣", royalMail: "✉" };
  function pinHtml(kinds, chosen) {
    const fill = kinds.length > 1 ? `linear-gradient(90deg, ${KINDS[kinds[0]].pin} 50%, ${KINDS[kinds[1]].pin} 50%)` : KINDS[kinds[0]].pin;
    const glyphs = kinds.map((k) => `<b style="color:${KINDS[k].onPin}">${GLYPH[k]}</b>`).join("");
    return `<div class="pickup-pin${chosen ? " chosen" : ""}" style="background:${fill}">${glyphs}</div>`;
  }

  /** The picker, drawn into `root`; `onChange(point)` runs when a place is chosen. */
  function mount(root, onChange) {
    root.className = "pickup";
    let chosen = saved();
    let map = null, layer = null, list = [];
    const head = el("div", "pickup-head");
    head.append(el("h3", "", "Where should it be delivered?"),
      el("p", "pickup-hint", "The owner posts it to a parcel locker or Post Office near you. Your ten days start when you collect it."));
    const form = el("form", "pickup-form");
    const field = el("input");
    Object.assign(field, { type: "text", placeholder: "Postcode, e.g. E8 3PB", autocomplete: "postal-code" });
    field.setAttribute("aria-label", "Postcode");
    const go = el("button", "qv-cta", "Search");
    go.type = "submit";
    const here = el("button", "chip", "Use my location");
    here.type = "button";
    form.append(field, go, here);
    const status = el("p", "pickup-status");
    status.setAttribute("role", "status");
    const mapBox = el("div", "pickup-map");
    mapBox.hidden = true;
    const legend = el("div", "pickup-legend");
    const rows = el("ul", "pickup-list");
    const choice = el("p", "pickup-chosen");
    root.replaceChildren(head, form, status, mapBox, legend, rows, choice);

    function showChoice() {
      choice.replaceChildren();
      if (!chosen) return;
      choice.append(el("span", "pickup-dot"), el("strong", "", chosen.name), el("span", "", ` · ${chosen.address}`));
      choice.firstChild.style.background = KINDS[chosen.kind].pin;
    }
    function choose(p) {
      chosen = p;
      keep(p);
      showChoice();
      draw();
      if (onChange) onChange(p);
    }

    /** A spot's card: the place at index `open`, or the one already chosen there, else the nearest. */
    function popup(spot, open = null) {
      const box = el("div", "pickup-popup");
      const p = open != null ? spot[open] : spot.find((q) => chosen && q.id === chosen.id) || spot[0];
      box.append(el("strong", "", p.name), el("small", "", `${p.address} · ${distanceText(p.distance)}`));
      if (spot.length > 1) {
        // Both here: pick the locker or the Post Office.
        const pick = el("div", "pickup-kinds");
        spot.forEach((q) => {
          const b = el("button", "pickup-kind" + (q.id === p.id ? " on" : ""), KINDS[q.kind].short);
          b.type = "button";
          b.style.setProperty("--kind", KINDS[q.kind].pin);
          b.style.setProperty("--on-kind", KINDS[q.kind].onPin);
          b.addEventListener("click", () => markers.get(spot[0].id).setPopupContent(popup(spot, spot.indexOf(q))));
          pick.appendChild(b);
        });
        box.appendChild(pick);
      }
      const use = el("button", "qv-cta", chosen && chosen.id === p.id ? "Chosen ✓" : "Choose");
      use.type = "button";
      use.addEventListener("click", () => { choose(p); map.closePopup(); });
      box.appendChild(use);
      return box;
    }

    const markers = new Map();
    function draw() {
      if (!map || !layer) return;
      layer.clearLayers();
      markers.clear();
      spots(list).forEach((spot) => {
        const kinds = [...new Set(spot.map((p) => p.kind))];
        const isChosen = chosen && spot.some((p) => p.id === chosen.id);
        const icon = window.L.divIcon({ className: "", html: pinHtml(kinds, isChosen), iconSize: [34, 42], iconAnchor: [17, 42], popupAnchor: [0, -38] });
        const m = window.L.marker([spot[0].lat, spot[0].lon], { icon, title: spot.map((p) => p.name).join(" / "), keyboard: true }).addTo(layer);
        m.bindPopup(() => popup(spot));
        markers.set(spot[0].id, m);
      });
      rows.replaceChildren(...list.map((p) => {
        const li = el("li");
        const b = el("button", "pickup-row" + (chosen && chosen.id === p.id ? " on" : ""));
        b.type = "button";
        const icon = el("span", "pickup-icon", GLYPH[p.kind]);
        icon.style.background = KINDS[p.kind].pin;
        icon.style.color = KINDS[p.kind].onPin;
        const text = el("span", "pickup-text");
        text.append(el("strong", "", p.name), el("small", "", p.address));
        b.append(icon, text, el("span", "pickup-distance", distanceText(p.distance)));
        b.addEventListener("click", () => {
          choose(p);
          const spot = spots(list).find((s) => s.some((q) => q.id === p.id));
          map.setView([p.lat, p.lon], Math.max(map.getZoom(), 15));
          markers.get(spot[0].id).bindPopup(popup(spot, spot.indexOf(p))).openPopup();
        });
        li.appendChild(b);
        return li;
      }));
    }

    async function search(center) {
      status.textContent = "Finding lockers and Post Offices…";
      try {
        const L = await loadLeaflet();
        mapBox.hidden = false;
        if (!map) {
          map = L.map(mapBox, { scrollWheelZoom: false }).setView([center.lat, center.lon], 14);
          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
          layer = L.layerGroup().addTo(map);
        }
        map.setView([center.lat, center.lon], 14);
        if (map._robeCircle) map.removeLayer(map._robeCircle);
        map._robeCircle = L.circle([center.lat, center.lon], { radius: RADIUS, color: "#5A189A", weight: 1.5, fillOpacity: 0.05 }).addTo(map);
        // Each kind shows as soon as it arrives: InPost's finder is quick, Post Offices can take longer.
        list = [];
        const show = (more) => {
          list = merged(center, list, more);
          const kinds = Object.keys(KINDS).filter((k) => list.some((p) => p.kind === k));
          legend.replaceChildren(el("span", "", `${list.length} within 3 km`), ...kinds.map((k) => {
            const s = el("span", "pickup-key", KINDS[k].short);
            s.style.setProperty("--kind", KINDS[k].pin);
            return s;
          }));
          draw();
        };
        const searches = [inPost(center), postOffices(center)].map((p) => p.then(show, () => {}));
        searches[0].then(() => { if (list.length) status.textContent = "Finding Post Offices…"; });
        await Promise.all(searches);
        status.textContent = list.length ? "" : "No parcel lockers or Post Offices found within 3 km. Try another postcode.";
      } catch (e) {
        status.textContent = e.message || "Something went wrong. Try again.";
      }
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!field.value.trim()) return;
      try { await search(await locate(field.value)); } catch (err) { status.textContent = err.message; }
    });
    here.addEventListener("click", () => {
      if (!navigator.geolocation) { status.textContent = "Your browser can't share your location. Enter a postcode instead."; return; }
      status.textContent = "Finding you…";
      navigator.geolocation.getCurrentPosition(
        (pos) => search({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => { status.textContent = "Couldn't get your location. Enter a postcode instead."; },
        { timeout: 10000 },
      );
    });
    showChoice();
  }

  window.RobePickup = { mount, spots, get chosen() { return saved(); } };
})();
