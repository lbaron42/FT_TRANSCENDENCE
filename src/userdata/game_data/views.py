import logging
from django.shortcuts import render, redirect
from django.db import IntegrityError
from rest_framework import generics
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.http import HttpResponse
from .serializers import GameDataSerializer
from .models import GameData
from user_management.models import Profile
from rest_framework.decorators import api_view
from rest_framework import status
from app.paginations import GameDataPagination

logger = logging.getLogger('django')

class GameDataCreate(generics.CreateAPIView):
	logger.info("Game creation request recieved")
	queryset = GameData.objects.all()
	serializer_class = GameDataSerializer

class GameDataList(generics.ListAPIView):
	queryset = GameData.objects.all()
	serializer_class = GameDataSerializer
	pagination_class = GameDataPagination
	
class GameUserHistory(generics.ListAPIView):
	queryset = GameData.objects.all()
	serializer_class = GameDataSerializer
	pagination_class = GameDataPagination
	
	def get_queryset(self):
		user = self.request.user
		if not user.is_authenticated:
			return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
		try:
			profile = Profile.objects.get(user=user)
		except Profile.DoesNotExist:
			return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
		queryset = GameData.objects.filter(players=profile)
		logger.info(f"The game data will be provided with {queryset.count()} games")
		return queryset
	