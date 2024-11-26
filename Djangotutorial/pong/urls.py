from django.urls import path

from . import views

urlpatterns = [
    path("gameplay/room_id", views.index, name="index"),
]
