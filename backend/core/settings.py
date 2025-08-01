"""
Django settings for core project.

Generated by 'django-admin startproject' using Django 5.0.7.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.0/ref/settings/
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv() 
if os.getenv('DJANGO_ENV') == 'production':
    load_dotenv()
else:
    load_dotenv()  

DJANGO_ENV = os.getenv('DJANGO_ENV', 'development')
IS_PRODUCTION = DJANGO_ENV == 'production'

print(IS_PRODUCTION)
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
# DEBUG = not IS_PRODUCTION
DEBUG = True
# ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')
# if IS_PRODUCTION:
#     ALLOWED_HOSTS = ['https://riffaa.com', 'https://www.riffaa.com']
ALLOWED_HOSTS = ['127.0.0.1', 'localhost']

# ========================
# Static & Media Files
# ========================
STATIC_URL = '/api/static/' if IS_PRODUCTION else '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_URL = '/api/media/' if IS_PRODUCTION else '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

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
    "courses", 
    "groups",
    "privetsessions",
    "flashcards",
    'notes',
    "jitsi",
    "notifications",
    'languagesteaching', 
    "chat"
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
SITE_ID = 1

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
GOOGLE_OAUTH_REDIRECT_URI = os.getenv('GOOGLE_OAUTH_REDIRECT_URI')
ZOOM_SDK_ID = os.getenv('ZOOM_SDK_ID')
ZOOM_SDK_SECRET = os.getenv('ZOOM_SDK_SECRET')


CLOUDFLARE_TURNSTILE_SECRET_KEY = os.getenv('CLOUDFLARE_TURNSTILE_SECRET_KEY')
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

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'
 
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],  
        },
    },
}

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

AUTH_USER_MODEL = 'users.User'

# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators


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


# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

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
   
}

CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', 'http://localhost:3000').split(',')
CORS_ALLOW_ALL_ORIGINS = not IS_PRODUCTION  

CORS_ALLOW_CREDENTIALS = True

if IS_PRODUCTION:
    CORS_ALLOWED_ORIGINS = [
        'https://riffaa.com',
        'https://www.riffaa.com',
    ]
    # SECURE_SSL_REDIRECT = True
    # SESSION_COOKIE_SECURE = True
    # CSRF_COOKIE_SECURE = True

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
]


# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
APPEND_SLASH=False 

# zoom settings

ZOOM_CLIENT_ID= os.getenv('ZOOM_CLIENT_ID')
ZOOM_CLIENT_SECRET= os.getenv('ZOOM_CLIENT_SECRET')
ZOOM_REDIRECT_URI= os.getenv('ZOOM_REDIRECT_URI')




SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),  # Access token validity
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),  # Refresh token validity
    'ROTATE_REFRESH_TOKENS': True,  # Optional: Rotate refresh tokens
    'BLACKLIST_AFTER_ROTATION': True,  # Optional: Blacklist old refresh tokens
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'AUTH_COOKIE': 'access_token',  # Cookie name for the JWT
    'AUTH_COOKIE_SECURE': False,  # Set to True in production
    'AUTH_COOKIE_HTTP_ONLY': True,  # True to prevent JavaScript access
}


# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend' if IS_PRODUCTION else \
                'django.core.mail.backends.console.EmailBackend'

EMAIL_HOST = os.getenv('EMAIL_HOST')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL')


DEFAULT_FRONTEND_VERIFY_URL = os.getenv('DEFAULT_FRONTEND_VERIFY_URL') 
 

GMAIL_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID")
GMAIL_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET")
GMAIL_REFRESH_TOKEN = os.getenv("GMAIL_REFRESH_TOKEN")
DEFAULT_FROM_EMAIL = "mahfoudhn99@gmail.com"  # Must match token permissions

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
#jitsi
JITSI_APP_SECRET= os.getenv('jitsi_app_secret')
JITSI_APP_ID = os.getenv('jisti_app_id')
JITSI_APP_DOMAIN = os.getenv('jitsi_domain')
