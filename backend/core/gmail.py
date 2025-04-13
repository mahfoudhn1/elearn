# your_app/utils.py
import base64
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from django.conf import settings

def send_verification_email(to_email, verification_token):
    """Send a verification email using Gmail API with refresh token."""
    try:
        # Get access token
        creds = Credentials(
            token=None,
            refresh_token=settings.GMAIL_REFRESH_TOKEN,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GMAIL_CLIENT_ID,
            client_secret=settings.GMAIL_CLIENT_SECRET

        )
        creds.refresh(Request())
        service = build('gmail', 'v1', credentials=creds)

        # Create verification link
        verification_link = f"{settings.DEFAULT_FRONTEND_VERIFY_URL}/api/verify-email/?token={verification_token}"

        # Email content
        message = f"""From: {settings.DEFAULT_FROM_EMAIL}
To: {to_email}
Subject: Verify Your Account
Content-Type: text/html; charset=utf-8

<p>Click the link to verify your account: <a href="{verification_link}">{verification_link}</a></p>"""

        # Encode and send
        encoded_msg = base64.urlsafe_b64encode(message.encode('utf-8')).decode('utf-8')
        service.users().messages().send(
            userId='me',
            body={'raw': encoded_msg}
        ).execute()
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        if "invalid_grant" in str(e):
            print("Refresh token may be expired or revoked. Generate a new one.")
        return False