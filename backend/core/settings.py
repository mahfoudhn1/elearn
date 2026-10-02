import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

DJANGO_ENV = os.getenv('DJANGO_ENV', 'development').lower()
IS_PRODUCTION = DJANGO_ENV == 'production'

# Secret key and debugging settings
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
DEBUG = os.getenv('DJANGO_DEBUG', str(not IS_PRODUCTION)).lower() in ('1', 'true', 'yes')

# Allowed hosts based on environment

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        'ALLOWED_HOSTS',
        'riffaa.com,www.riffaa.com,localhost,127.0.0.1',
    ).split(',')
    if host.strip()
]
# ========================
# Static & Media Files
# ========================
STATIC_URL = '/api/static/' if IS_PRODUCTION else '/static/'
STATIC_ROOT = os.getenv(
    'STATIC_ROOT',
    '/var/www/staticfiles/' if IS_PRODUCTION else str(BASE_DIR / 'staticfiles'),
)
MEDIA_URL = '/api/media/' if IS_PRODUCTION else '/media/'
MEDIA_ROOT = os.getenv(
    'MEDIA_ROOT',
    '/var/www/media/' if IS_PRODUCTION else str(BASE_DIR / 'media'),
)

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'daphne',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework.authtoken',
    'channels',
    'users',
    'subscription',
    'livestream',
    'media_assets',
    'courses',
    'groups',
    'privetsessions',
    'flashcards',
    'notes',
    'jitsi',
    'notifications',
    "chat",
    'languagesteaching', 
    "froms",
    "studentform",    'tracking',    "riffaaAi",
    "schedule"

    ]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
)

# Site ID for the application
SITE_ID = 1

# Google and Zoom OAuth credentials
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
GOOGLE_OAUTH_REDIRECT_URI = os.getenv('GOOGLE_OAUTH_REDIRECT_URI')
ZOOM_SDK_ID = os.getenv('ZOOM_SDK_ID')
ZOOM_SDK_SECRET = os.getenv('ZOOM_SDK_SECRET')

# Cloudflare Turnstile secret key
CLOUDFLARE_TURNSTILE_SECRET_KEY = os.getenv('CLOUDFLARE_TURNSTILE_SECRET_KEY')

# Template settings
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# WSGI and ASGI application settings
WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

# Channel layers configuration for Redis
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')],
        },
    },
}

# Database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT'),
    }
}

# Custom user model
AUTH_USER_MODEL = 'users.User'

# Password validation settings
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization and timezone settings
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static and media files settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'core.authentications.JWTAuthenticationWithCookies',  # Custom JWT authentication class

    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',  # Default lock
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',  # Add authenticated user limit
    },
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',  # Disable web API UI in production
    ],
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend']
}

#CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', 'http://localhost:3000').split(',')
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        'CSRF_TRUSTED_ORIGINS',
        'https://riffaa.com,https://www.riffaa.com,http://localhost:3000,'
        'http://localhost:8081,http://127.0.0.1:3000,http://127.0.0.1:8081',
    ).split(',')
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

# CORS settings for production
if IS_PRODUCTION:
    CORS_ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            'CORS_ALLOWED_ORIGINS',
            'https://riffaa.com,https://www.riffaa.com',
        ).split(',')
        if origin.strip()
    ]

else:
    CORS_ALLOW_ALL_ORIGINS = True  # Allow all origins in development

# CORS allowed methods and headers
CORS_ALLOWED_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
]

CORS_ALLOWED_HEADERS = [
    'authorization',
    'content-type',
    'x-csrftoken',
    'x-mobile-client',
]

SECURE_HSTS_SECONDS = 31_536_000 if IS_PRODUCTION else 0
#SECURE_HSTS_INCLUDE_SUBDOMAINS = True
#SECURE_HSTS_PRELOAD = True
CSRF_COOKIE_HTTPONLY = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'same-origin'
SECURE_SSL_REDIRECT = IS_PRODUCTION
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = IS_PRODUCTION
CSRF_COOKIE_SECURE = IS_PRODUCTION


# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Zoom settings
ZOOM_CLIENT_ID = os.getenv('ZOOM_CLIENT_ID')
ZOOM_CLIENT_SECRET = os.getenv('ZOOM_CLIENT_SECRET')
ZOOM_REDIRECT_URI = os.getenv('ZOOM_REDIRECT_URI')

# JWT settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_SECURE': IS_PRODUCTION,
    'AUTH_COOKIE_HTTP_ONLY': True,
}

# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend' if IS_PRODUCTION else 'django.core.mail.backends.console.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL')

GMAIL_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID")
GMAIL_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET")
GMAIL_REFRESH_TOKEN = os.getenv("GMAIL_REFRESH_TOKEN")
DEFAULT_FROM_EMAIL = "mahfoudhn99@gmail.com"

# Frontend verification URL
DEFAULT_FRONTEND_VERIFY_URL = os.getenv('DEFAULT_FRONTEND_VERIFY_URL')
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
# Jitsi settings
JITSI_APP_SECRET = os.getenv('jitsi_app_secret')
JITSI_APP_ID = os.getenv('jisti_app_id')
JITSI_APP_DOMAIN = os.getenv('jitsi_domain')

R2_ACCESS_KEY_ID = os.getenv('R2_ACCESS_KEY_ID')
R2_SECRET_ACCESS_KEY = os.getenv('R2_SECRET_ACCESS_KEY')
R2_BUCKET_NAME = os.getenv('R2_BUCKET_NAME')
R2_ENDPOINT_URL = os.getenv('R2_ENDPOINT_URL')


DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')
DEEPSEEK_API_URL = os.getenv('DEEPSEEK_API_URL')

# Facebook Ads API
FACEBOOK_ACCESS_TOKEN = os.getenv('FACEBOOK_ACCESS_TOKEN')
FACEBOOK_PIXEL_ID = os.getenv('FACEBOOK_PIXEL_ID')
