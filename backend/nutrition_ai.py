"""Запросы к бесплатному LLM (Groq или Google Gemini)."""

import os

import aiohttp

SYSTEM_PROMPT = """Ты — дружелюбный помощник по питанию в приложении «Калькулятор калорий».
Отвечай по-русски, кратко и по делу (обычно 3–8 предложений).
Давай общие советы по рациону, БЖУ, режиму питания, простым продуктам.
Не ставь диагнозы, не назначай лекарства и диеты при болезнях — при серьёзных вопросах советуй врача/диетолога.
Если передан контекст пользователя (норма, съедено за день, цель) — учитывай его в ответе."""


def _provider() -> str:
    return (os.getenv("AI_PROVIDER") or "groq").strip().lower()


async def ask_nutrition(
    user_message: str,
    context_text: str | None = None,
    history: list[dict] | None = None,
) -> str:
    provider = _provider()
    if provider == "gemini":
        return await _ask_gemini(user_message, context_text, history)
    return await _ask_groq(user_message, context_text, history)


async def _ask_groq(
    user_message: str,
    context_text: str | None,
    history: list[dict] | None,
) -> str:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Не задан GROQ_API_KEY в .env (бесплатный ключ: console.groq.com)")

    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if context_text:
        messages.append(
            {
                "role": "system",
                "content": f"Контекст из приложения:\n{context_text}",
            }
        )
    for item in history or []:
        role = item.get("role")
        content = (item.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_message})

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"model": model, "messages": messages, "temperature": 0.6, "max_tokens": 800}

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            data = await resp.json()
            if resp.status != 200:
                detail = data.get("error", data)
                raise RuntimeError(f"Groq API: {detail}")
            return (data["choices"][0]["message"]["content"] or "").strip()


async def _ask_gemini(
    user_message: str,
    context_text: str | None,
    history: list[dict] | None,
) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Не задан GEMINI_API_KEY в .env (aistudio.google.com)")

    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
    parts = [SYSTEM_PROMPT]
    if context_text:
        parts.append(f"Контекст из приложения:\n{context_text}")
    for item in history or []:
        role = item.get("role")
        content = (item.get("content") or "").strip()
        if not content:
            continue
        label = "Пользователь" if role == "user" else "Ассистент"
        parts.append(f"{label}: {content}")
    parts.append(f"Пользователь: {user_message}")
    prompt = "\n\n".join(parts)

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={api_key}"
    )
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            data = await resp.json()
            if resp.status != 200:
                raise RuntimeError(f"Gemini API: {data}")
            candidates = data.get("candidates") or []
            if not candidates:
                raise RuntimeError("Gemini: пустой ответ")
            text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return (text or "").strip()
