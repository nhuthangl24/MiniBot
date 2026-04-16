import logging
import os
from typing import Optional

import httpx
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes, MessageHandler, filters


def _env_url(name: str, default: Optional[str] = None) -> str:
    value = os.getenv(name, default)
    if not value:
        return ""
    return value.rstrip("/")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Hello! I can echo messages, show weather, and translate text. "
        "Use /help for commands."
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Commands:\n"
        "/start - welcome message\n"
        "/weather <city> - current weather using Open-Meteo\n"
        "/translate <target_lang> <text> - translate with LibreTranslate\n"
        "\nExamples:\n"
        "/weather Hanoi\n"
        "/translate en Xin chao"
    )


async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(update.message.text)


async def weather(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Usage: /weather <city>")
        return

    city = " ".join(context.args)
    geocoding_url = _env_url("OPENMETEO_GEOCODING_URL")
    forecast_url = _env_url("OPENMETEO_FORECAST_URL")

    if not geocoding_url or not forecast_url:
        await update.message.reply_text("Open-Meteo URLs are missing in .env.")
        return

    async with httpx.AsyncClient(timeout=10) as client:
        geo_resp = await client.get(
            geocoding_url,
            params={"name": city, "count": 1, "language": "en", "format": "json"},
        )
        geo_resp.raise_for_status()
        geo_data = geo_resp.json()

        results = geo_data.get("results") or []
        if not results:
            await update.message.reply_text(f"No location found for '{city}'.")
            return

        loc = results[0]
        latitude = loc["latitude"]
        longitude = loc["longitude"]
        place = ", ".join(
            part
            for part in [loc.get("name"), loc.get("admin1"), loc.get("country")]
            if part
        )

        forecast_resp = await client.get(
            forecast_url,
            params={
                "latitude": latitude,
                "longitude": longitude,
                "current_weather": True,
                "timezone": "auto",
            },
        )
        forecast_resp.raise_for_status()
        forecast = forecast_resp.json()

    current = forecast.get("current_weather") or {}
    temperature = current.get("temperature")
    windspeed = current.get("windspeed")
    weathercode = current.get("weathercode")

    if temperature is None:
        await update.message.reply_text("Weather data unavailable right now.")
        return

    await update.message.reply_text(
        f"{place}\n"
        f"Temperature: {temperature} C\n"
        f"Wind: {windspeed} km/h\n"
        f"Weather code: {weathercode}"
    )


async def translate(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if len(context.args) < 2:
        await update.message.reply_text("Usage: /translate <target_lang> <text>")
        return

    target_lang = context.args[0]
    text = " ".join(context.args[1:])

    base_url = _env_url("LIBRETRANSLATE_URL", "https://libretranslate.com")
    if not base_url:
        await update.message.reply_text("LibreTranslate URL is missing in .env.")
        return

    translate_url = f"{base_url}/translate"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            translate_url,
            json={"q": text, "source": "auto", "target": target_lang, "format": "text"},
        )
        if resp.status_code >= 400:
            await update.message.reply_text("Translation failed. Check the service URL.")
            return

        data = resp.json()

    translated = data.get("translatedText")
    if not translated:
        await update.message.reply_text("No translation returned.")
        return

    await update.message.reply_text(translated)


def main() -> None:
    load_dotenv()

    token = os.getenv("BOT_TOKEN")
    if not token:
        raise RuntimeError("BOT_TOKEN is missing in .env")

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    app = ApplicationBuilder().token(token).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("weather", weather))
    app.add_handler(CommandHandler("translate", translate))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    app.run_polling()


if __name__ == "__main__":
    main()
