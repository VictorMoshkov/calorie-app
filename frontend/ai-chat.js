/**
 * Чат с ИИ по питанию (запросы на backend бота).
 */

const STORAGE_AI_API = "calorie-app-ai-api";

export function saveAiApiBase(url) {
  const base = (url || "").trim().replace(/\/$/, "");
  try {
    if (base) localStorage.setItem(STORAGE_AI_API, base);
    else localStorage.removeItem(STORAGE_AI_API);
  } catch {
    /* ignore */
  }
}

export function resolveAiApiBase() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("api")?.trim();
  if (fromUrl) {
    const base = fromUrl.replace(/\/$/, "");
    saveAiApiBase(base);
    return base;
  }
  try {
    return (localStorage.getItem(STORAGE_AI_API) || "").replace(/\/$/, "");
  } catch {
    return "";
  }
}

/**
 * @param {{ message: string, initData: string, context?: object, history?: { role: string, content: string }[] }} opts
 */
export async function sendNutritionQuestion(opts) {
  const base = resolveAiApiBase();
  if (!base) {
    throw new Error(
      "Не задан адрес сервера ИИ. Добавьте в ссылку Mini App параметр api= (URL бота на Fly.io)."
    );
  }
  const res = await fetch(`${base}/api/nutrition-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Ошибка ${res.status}`);
  }
  return data.reply;
}
