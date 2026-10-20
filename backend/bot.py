"""
Telegram-бот для Mini App «Калькулятор калорий».
Обрабатывает /start и показывает кнопку открытия веб-приложения.
"""

import asyncio
import os

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
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

if not BOT_TOKEN:
    raise RuntimeError("Не найден BOT_TOKEN. Создайте файл .env по образцу .env.example")

if not WEBAPP_URL:
    raise RuntimeError("Не найден WEBAPP_URL. Создайте файл .env по образцу .env.example")

session = AiohttpSession(proxy=PROXY_URL) if PROXY_URL else AiohttpSession()
bot = Bot(token=BOT_TOKEN, session=session)
dp = Dispatcher()


def webapp_keyboard() -> InlineKeyboardMarkup:
    """Кнопка, которая открывает Mini App внутри Telegram."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🍎 Открыть калькулятор",
                    web_app=WebAppInfo(url=WEBAPP_URL),
                )
            ]
        ]
    )


@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    await message.answer(
        "Привет! 👋\n\n"
        "Это <b>Калькулятор калорий</b> — Mini App для учёта еды и БЖУ.\n\n"
        "Нажми кнопку ниже, чтобы открыть приложение:",
        reply_markup=webapp_keyboard(),
        parse_mode="HTML",
    )


@dp.message(F.text)
async def any_text(message: Message) -> None:
    """На любое другое сообщение снова предлагаем открыть Mini App."""
    await message.answer(
        "Чтобы открыть калькулятор, нажми кнопку:",
        reply_markup=webapp_keyboard(),
    )


async def main() -> None:
    if PROXY_URL:
        print(f"Прокси: {PROXY_URL}")
    print("Бот запущен. Нажми Ctrl+C чтобы остановить.")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
