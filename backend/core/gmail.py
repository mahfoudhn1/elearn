

import resend
from django.conf import settings

def send_verification_email(to_email, verification_token):
    """Send a verification email using Resend API."""
    try:
        # Set Resend API key
        resend.api_key = settings.RESEND_API_KEY

        # Create verification link
        verification_link = f"{settings.DEFAULT_FRONTEND_VERIFY_URL}/api/verify-email/?token={verification_token}"

        # Define email parameters
        params = {
            "from": "Riffaa <support@riffaa.com>",  
            "to": [to_email],
            "subject": "مرحبًا بك في رِفعة",
            "html": f"""
                <p>بقيت خطوة واحدة فقط!</p>
                <p>يرجى تفعيل حسابك في رِفعة من خلال الرابط التالي:</p>
                <a href="{verification_link}">{verification_link}</a>
                <p>إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذه الرسالة.</p>
                <p>مع تحيات فريق رِفعة</p>
            """,
        }

        # Send the email
        email = resend.Emails.send(params)
        print("Email sent:", email)
        return True

    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False
