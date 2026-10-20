"""Проверка подписи Telegram WebApp initData."""

import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl


def validate_init_data(init_data: str, bot_token: str, max_age_sec: int = 86400) -> dict | None:
    """
    Возвращает dict с полями initData (в т.ч. user как dict) или None, если подпись неверна.
    """
    if not init_data or not bot_token:
        return None

    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        return None

    data_check = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs.keys()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        return None

    auth_date = int(pairs.get("auth_date", "0") or "0")
    if auth_date and time.time() - auth_date > max_age_sec:
        return None

    if "user" in pairs:
        try:
            pairs["user"] = json.loads(pairs["user"])
        except json.JSONDecodeError:
            return None

    return pairs
