"""
Telegram-бот для Mini App «Калькулятор калорий».
Обрабатывает /start и показывает кнопку открытия веб-приложения.
"""

import asyncio
import os
from urllib.parse import quote

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)
from aiogram.client.session.aiohttp import AiohttpSession
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
WEBAPP_URL = os.getenv("WEBAPP_URL", "").strip()
PROXY_URL = os.getenv("PROXY_URL", "").strip() or None
PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "").strip().rstrip("/")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

if not BOT_TOKEN:
    raise RuntimeError("Не найден BOT_TOKEN. Создайте файл .env по образцу .env.example")

if not WEBAPP_URL:
    raise RuntimeError("Не найден WEBAPP_URL. Создайте файл .env по образцу .env.example")

session = AiohttpSession(proxy=PROXY_URL) if PROXY_URL else AiohttpSession()
bot = Bot(token=BOT_TOKEN, session=session)
dp = Dispatcher()


def effective_webapp_url() -> str:
    """Добавляет api= в ссылку Mini App, если задан PUBLIC_API_URL."""
    url = WEBAPP_URL
    if PUBLIC_API_URL and "api=" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}api={quote(PUBLIC_API_URL, safe='')}"
    return url


def webapp_keyboard() -> InlineKeyboardMarkup:
    """Кнопка, которая открывает Mini App внутри Telegram."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🍎 Открыть калькулятор",
                    web_app=WebAppInfo(url=effective_webapp_url()),
                )
            ]
        ]
    )


@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    await message.answer(
        "Привет! 👋\n\n"
        "Это <b>Калькулятор калорий</b> — Mini App для учёта еды и БЖУ.\n\n"
        "Нажми кнопку ниже, чтобы открыть приложение.\n\n"
        "Вопросы по питанию: кнопка <b>ИИ</b> в приложении или команда /ask",
        reply_markup=webapp_keyboard(),
        parse_mode="HTML",
    )


@dp.message(Command("ask"))
async def cmd_ask(message: Message) -> None:
    question = (message.text or "").split(maxsplit=1)
    text = question[1].strip() if len(question) > 1 else ""
    if not text:
        await message.answer(
            "Напишите вопрос после команды, например:\n"
            "<code>/ask чем заменить сладкое на ужин?</code>",
            parse_mode="HTML",
            reply_markup=webapp_keyboard(),
        )
        return
    if not GROQ_API_KEY:
        await message.answer(
            "ИИ не настроен: добавьте GROQ_API_KEY в backend/.env "
            "(бесплатно: console.groq.com/keys)",
            reply_markup=webapp_keyboard(),
        )
        return
    await message.answer("Думаю… ⏳")
    try:
        from nutrition_ai import ask_nutrition

        reply = await ask_nutrition(text, None, None)
        await message.answer(reply[:4000], reply_markup=webapp_keyboard())
    except Exception as e:
        await message.answer(
            f"Не удалось ответить: {e}",
            reply_markup=webapp_keyboard(),
        )


@dp.message(F.text)
async def any_text(message: Message) -> None:
    """На любое другое сообщение снова предлагаем открыть Mini App."""
    await message.answer(
        "Открой калькулятор кнопкой ниже или спроси ИИ: /ask ваш вопрос",
        reply_markup=webapp_keyboard(),
    )


async def main() -> None:
    if PROXY_URL:
        print(f"Прокси: {PROXY_URL}")

    from api_server import start_api_server

    api_runner = await start_api_server(BOT_TOKEN)
    if GROQ_API_KEY:
        print("ИИ: Groq подключён (/ask и чат в Mini App).")
    else:
        print("ИИ: задайте GROQ_API_KEY в .env (console.groq.com/keys).")
    if PUBLIC_API_URL:
        print(f"Mini App API: {PUBLIC_API_URL}")
    print("Бот запущен. Нажми Ctrl+C чтобы остановить.")
    try:
        await dp.start_polling(bot)
    finally:
        await api_runner.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
