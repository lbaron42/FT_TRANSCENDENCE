from django.urls import path
from . import views

urlpatterns = [
	path('addgame/', views.GameDataCreate.as_view(), name='add-game'),
	path('listgames/', views.GameDataList.as_view(), name='list-games'),
	path('game-history/', views.GameUserHistory.as_view(), name='game-history'),
]
