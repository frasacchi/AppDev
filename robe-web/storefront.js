// Live storefront: replaces the sample cards in #listings with the newest active
// listings from Supabase's public_listings view. Uses the REST API directly, so no
// client library is needed. If config is empty or the request fails, the sample
// cards stay as they are. Cards are built by showcase.js, as for the samples.

const STOREFRONT_LIMIT = 24;
const PHOTO_BUCKET = "listing-photos";

function photoUrl(base, path) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${encoded}`;
}

// A listing row as a piece for showcase.js. Its card sets every text with
// textContent, so listing text from users can never inject HTML.
function pieceFromRow(base, row, index) {
  return {
    id: `live-${row.id ?? index}`,
    title: row.title || "Untitled",
    brand: row.brand || "",
    size: row.size ? `UK ${row.size}` : "One size",
    category: row.category || "dresses",
    colour: row.colour || "",
    rent: Math.round((row.rental_price_pence || 0) / 100),
    owner: { name: row.owner_name || "A wardrobe", area: row.area || "London", shop: row.owner_kind === "shop" },
    favourites: 0,
    photos: (row.photo_paths || []).map((path) => photoUrl(base, path)),
  };
}

async function loadStorefront() {
  const cfg = window.ROBE_CONFIG || {};
  const grid = document.querySelector("#listings .listing-grid");
  const showcase = window.RobeShowcase;
  if (!grid || !showcase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;

  const base = cfg.supabaseUrl.replace(/\/+$/, "");
  const url = `${base}/rest/v1/public_listings?select=*&order=listed_at.desc&limit=${STOREFRONT_LIMIT}`;

  try {
    const res = await fetch(url, {
      headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}` },
    });
    if (!res.ok) throw new Error(`Supabase responded ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return; // keep samples until there are real listings
    grid.replaceChildren(...rows.map((row, i) => showcase.card(pieceFromRow(base, row, i))));
  } catch (err) {
    console.warn("[robe] storefront: keeping sample listings", err);
  }
}

document.addEventListener("DOMContentLoaded", loadStorefront);
