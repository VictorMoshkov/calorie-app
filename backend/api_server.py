"""HTTP API для Mini App (чат по питанию)."""

import json
import os
import time
from collections import defaultdict

from aiohttp import web

from nutrition_ai import ask_nutrition
from webapp_auth import validate_init_data

# Простой лимит: не больше N запросов в час на user_id
_RATE_LIMIT = int(os.getenv("AI_RATE_LIMIT_PER_HOUR", "30"))
_rate: dict[int, list[float]] = defaultdict(list)


def _cors_headers(request: web.Request) -> dict[str, str]:
    origin = request.headers.get("Origin", "")
    allowed = (os.getenv("CORS_ORIGINS") or "*").strip()
    if allowed == "*":
        return {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    if origin and origin in [o.strip() for o in allowed.split(",")]:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Vary": "Origin",
        }
    return {}


def _check_rate(user_id: int) -> bool:
    now = time.time()
    window = _rate[user_id]
    window[:] = [t for t in window if now - t < 3600]
    if len(window) >= _RATE_LIMIT:
        return False
    window.append(now)
    return True


async def handle_options(request: web.Request) -> web.Response:
    return web.Response(status=204, headers=_cors_headers(request))


async def handle_nutrition_chat(request: web.Request) -> web.Response:
    bot_token = request.app["bot_token"]
    headers = _cors_headers(request)

    try:
        body = await request.json()
    except json.JSONDecodeError:
        return web.json_response({"error": "Неверный JSON"}, status=400, headers=headers)

    init_data = (body.get("initData") or "").strip()
    message = (body.get("message") or "").strip()
    context = body.get("context")
    history = body.get("history") or []

    if not message or len(message) > 2000:
        return web.json_response(
            {"error": "Сообщение пустое или слишком длинное (макс. 2000 символов)"},
            status=400,
            headers=headers,
        )

    validated = validate_init_data(init_data, bot_token)
    if not validated:
        return web.json_response(
            {"error": "Откройте чат из Telegram Mini App (неверная подпись)"},
            status=403,
            headers=headers,
        )

    user = validated.get("user") or {}
    user_id = int(user.get("id") or 0)
    if not user_id or not _check_rate(user_id):
        return web.json_response(
            {"error": "Слишком много запросов. Попробуйте позже."},
            status=429,
            headers=headers,
        )

    context_text = None
    if isinstance(context, str) and context.strip():
        context_text = context.strip()[:4000]
    elif isinstance(context, dict):
        context_text = json.dumps(context, ensure_ascii=False)[:4000]

    if not isinstance(history, list):
        history = []
    history = history[-6:]

    try:
        reply = await ask_nutrition(message, context_text, history)
    except RuntimeError as e:
        return web.json_response({"error": str(e)}, status=503, headers=headers)
    except Exception:
        return web.json_response(
            {"error": "Сервис ИИ временно недоступен"},
            status=502,
            headers=headers,
        )

    return web.json_response({"reply": reply}, headers=headers)


async def handle_health(_request: web.Request) -> web.Response:
    return web.json_response({"ok": True, "service": "nutrition-ai"})


def create_app(bot_token: str) -> web.Application:
    app = web.Application()
    app["bot_token"] = bot_token
    app.router.add_get("/health", handle_health)
    app.router.add_route("OPTIONS", "/api/nutrition-chat", handle_options)
    app.router.add_post("/api/nutrition-chat", handle_nutrition_chat)
    return app


async def start_api_server(bot_token: str) -> web.AppRunner:
    port = int(os.getenv("PORT", "8080"))
    app = create_app(bot_token)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    print(f"API ИИ: http://0.0.0.0:{port}/api/nutrition-chat")
    return runner
