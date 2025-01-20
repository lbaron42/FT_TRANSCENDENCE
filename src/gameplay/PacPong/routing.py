from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
	re_path(r'ws/gameplay/PacPong/(?P<max_score>\w+)/(?P<max_player>\w+)/(?P<lobby_id>\w+)/$',consumers.PacPongGame.as_asgi())
]