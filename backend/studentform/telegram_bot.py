# telegram_bot.py
import requests

TELEGRAM_BOT_TOKEN = "8129610278:AAEpPRecD58ff2iSUFPT67cGeNn-YqDlVXY"
TELEGRAM_CHAT_ID = "769473948"  

def send_telegram_notification(message: str):
    """
    Send a message to a Telegram chat using a bot.
    """
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,  # Changed from "message" to message
        "parse_mode": "HTML"
    }
    try:
        response = requests.post(url, data=payload)
        response.raise_for_status()
        print(f"Message sent successfully: {response.json()}")
    except Exception as e:
        print(f"Failed to send Telegram message: {e}")

