from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
    path('update-profile/', views.update_profile_view, name='update_profile'),
    path('upload-avatar/', views.upload_avatar, name='upload_avatar'),
    path('add-friend/', views.add_friend_view, name='add_friend'),
	#path('game-history/', views.add_friend_view, name='game_history')
]
