from django.urls import re_path
from .consumers import LobbyConsumer

websocket_urlpatterns = [
    re_path(r'ws/lobby/(?P<pac_pong>\w+)/(?P<lobby_id>\w+)/(?P<user_name>\w+)/$', LobbyConsumer.as_asgi()),
]
