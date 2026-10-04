// Live storefront: replaces the sample cards in #listings with the newest active
// listings from Supabase's public_listings view. Uses the REST API directly, so no
// client library is needed. If config is empty or the request fails, the sample
// cards stay as they are.

const STOREFRONT_LIMIT = 8;
const PHOTO_BUCKET = "listing-photos";

function formatPrice(pence) {
  const pounds = pence / 100;
  return `£${Number.isInteger(pounds) ? pounds : pounds.toFixed(2)}`;
}

function photoUrl(base, path) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${encoded}`;
}

// Built with textContent so listing text from users can never inject HTML.
function listingCard(base, row) {
  const card = document.createElement("div");
  card.className = "listing-card";

  const firstPhoto = (row.photo_paths || [])[0];
  if (firstPhoto) {
    const img = document.createElement("img");
    img.className = "listing-photo";
    img.loading = "lazy";
    img.src = photoUrl(base, firstPhoto);
    img.alt = row.title;
    card.appendChild(img);
  } else {
    const blank = document.createElement("div");
    blank.className = "listing-photo listing-photo-empty";
    card.appendChild(blank);
  }

  const body = document.createElement("div");
  body.className = "listing-body";

  const brand = document.createElement("div");
  brand.className = "brand";
  brand.textContent = row.brand;

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = row.title;

  const price = document.createElement("div");
  price.className = "price";
  price.textContent = `${formatPrice(row.rental_price_pence)} `;
  const unit = document.createElement("span");
  unit.textContent = row.size ? `/ 10 days · size ${row.size}` : "/ 10 days";
  price.appendChild(unit);

  body.append(brand, title, price);
  card.appendChild(body);
  return card;
}

async function loadStorefront() {
  const cfg = window.ROBE_CONFIG || {};
  const grid = document.querySelector("#listings .listing-grid");
  if (!grid || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;

  const base = cfg.supabaseUrl.replace(/\/+$/, "");
  const url = `${base}/rest/v1/public_listings?select=*&order=listed_at.desc&limit=${STOREFRONT_LIMIT}`;

  try {
    const res = await fetch(url, {
      headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}` },
    });
    if (!res.ok) throw new Error(`Supabase responded ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return; // keep samples until there are real listings
    grid.replaceChildren(...rows.map((row) => listingCard(base, row)));
  } catch (err) {
    console.warn("[robe] storefront: keeping sample listings", err);
  }
}

document.addEventListener("DOMContentLoaded", loadStorefront);
