"""
Django settings for app project.

Generated by 'django-admin startproject' using Django 4.2.3.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/4.2/ref/settings/
"""
import environ
import sys
from pathlib import Path
from datetime import timedelta


env = environ.Env()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env("USERDATA_SECRET_KEY", default="change_me")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env.bool("USERDATA_DEBUG", default=False)

ALLOWED_HOSTS = env.list("USERDATA_DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "[::1]", "nginx"])

# Application definition

INSTALLED_APPS = [
    'user_management.apps.UserManagementConfig',
	'game_data.apps.GameDataConfig',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
]

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = env("USERDATA_EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("USERDATA_EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("USERDATA_EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("USERDATA_EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("USERDATA_EMAIL_HOST_PASSWORD", default="")

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

ROOT_URLCONF = 'app.urls'

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_USER_CLASS': 'django.contrib.auth.models.User',
    'TOKEN_OBTAIN_SERIALIZER': 'your_app.serializers.TokenWith2FASerializer',
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
			'stream': sys.stdout,
        },
    },
    'loggers': {
        'django.db.backends': {
            'level': 'INFO', # Set to DEBUG if also db queries should be shown
            'handlers': ['console'],
        },
    },
}

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

WSGI_APPLICATION = 'app.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
 	"default": {
         "ENGINE": env("USERDATA_DB_ENGINE", default="django.db.backends.sqlite3"),
         "NAME": str(env("USERDATA_DB_NAME", default=BASE_DIR / "db.sqlite3")),
         "USER": env("USERDATA_DB_USER", default="user"),
         "PASSWORD": env("USERDATA_DB_PASSWORD", default="password"),
         "HOST": env("USERDATA_DB_HOST", default="localhost"),
         "PORT": env("USERDATA_DB_PORT", default="5432"),
    }
}

# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

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

MICROSERVICE_SECRET_TOKEN = env("MICROSERVICE_SECRET_TOKEN", default="default_secret")

# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

CSRF_TRUSTED_ORIGINS = ["http://localhost"]

CSRF_COOKIE_HTTPONLY = False

CSRF_COOKIE_SECURE = False

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / "staticfiles"

# Redirect after successful login
LOGIN_REDIRECT_URL = "/"  # User is redirected to their profile page after login

# Redirect after successful logout
LOGOUT_REDIRECT_URL = "/"  # Redirect to the home page after logout

# URL where unauthenticated users are redirected
#LOGIN_URL = "/users/login/"  # Ensures proper redirection for @login_required views

# Redirect after successful signup
SIGNUP_REDIRECT_URL = "/"

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760

FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760
