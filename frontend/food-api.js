/**
 * Поиск продуктов через Open Food Facts (бесплатная база).
 * https://world.openfoodfacts.org
 */

const SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickKcal(nutriments) {
  return (
    num(nutriments["energy-kcal_100g"]) ||
    num(nutriments["energy-kcal"]) ||
    num(nutriments.energy_100g) / 4.184 ||
    0
  );
}

/** @param {Record<string, unknown>} raw */
export function normalizeProduct(raw) {
  const n = raw.nutriments || {};
  const name = String(raw.product_name || raw.generic_name || "Без названия").trim();
  const brand = raw.brands ? String(raw.brands).split(",")[0].trim() : "";

  const kcal100 = Math.round(pickKcal(n));
  const protein100 = round1(num(n.proteins_100g) || num(n.proteins));
  const fat100 = round1(num(n.fat_100g) || num(n.fat));
  let carbs100 = round1(
    num(n.carbohydrates_100g) ||
      num(n.carbohydrates) ||
      num(n["carbohydrates-value"])
  );

  if (carbs100 <= 0 && kcal100 > 0) {
    const fromKcal = (kcal100 - protein100 * 4 - fat100 * 9) / 4;
    if (fromKcal > 0) carbs100 = round1(fromKcal);
  }

  return {
    id: String(raw.code || raw._id || name),
    name: brand ? `${name} (${brand})` : name,
    kcal100,
    protein100,
    fat100,
    carbs100,
  };
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

/**
 * @param {string} query
 * @returns {Promise<ReturnType<typeof normalizeProduct>[]>}
 */
export async function searchFoods(query) {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    search_terms: q,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "20",
    lc: "ru",
    countries: "Russia",
    fields: "code,product_name,generic_name,brands,nutriments",
  });

  const res = await fetch(`${SEARCH_URL}?${params}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Ошибка базы: ${res.status}`);
  }

  const data = await res.json();
  const list = Array.isArray(data.products) ? data.products : [];

  return list
    .map(normalizeProduct)
    .filter((p) => p.kcal100 > 0 || p.protein100 > 0 || p.carbs100 > 0);
}
