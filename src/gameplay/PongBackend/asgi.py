"""
ASGI config for PongBackend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import Pong.routing
import PacPong.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PongBackend.settings')

application = ProtocolTypeRouter({
	'http':get_asgi_application(),
	'websocket':AuthMiddlewareStack(
		URLRouter(
			Pong.routing.websocket_urlpatterns + PacPong.routing.websocket_urlpatterns
		)
	)
})
