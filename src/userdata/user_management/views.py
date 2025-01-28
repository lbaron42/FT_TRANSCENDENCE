import logging
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.utils.crypto import get_random_string
from django.shortcuts import render, redirect
from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.http import HttpResponse
from .models import Profile
from .serializers import UserSerializer, ProfileSerializer
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser


logger = logging.getLogger('django')

@api_view(['POST'])
def signup_view(request):
    logger.info("Signup request received.")
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email')

    if not username or not password or not email:
        logger.error("Invalid signup data.")
        return Response({"error": "Invalid data"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        logger.error(f"Username already exists: {username}")
        return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.create_user(username=username, password=password, email=email)
        logger.info(f"User created: {username} (ID: {user.id})")
        return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
    except IntegrityError as e:
        logger.error(f"IntegrityError during signup: {e}")
        return Response({"error": "An error occurred during signup."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)

    if user is not None:
        login(request, user)
        return Response({"message": "Login successful"}, status=status.HTTP_200_OK)

    return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)

@api_view(['GET'])
def profile_view(request):
    if not request.user.is_authenticated:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        profile = Profile.objects.get(user=request.user)
        serializer = ProfileSerializer(profile)
        data = serializer.data
        data['csrf_token'] = get_token(request)
        return Response(data, status=status.HTTP_200_OK)
    except Profile.DoesNotExist:
        return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@login_required
@parser_classes([MultiPartParser, FormParser])
def update_profile_view(request):
    profile = Profile.objects.get(user=request.user)
    serializer = ProfileSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        user = profile.user
        email = request.data.get('email')
        if email:
            user.email = email
            user.save()

        serializer.save()
        return Response({"message": "Profile updated successfully"}, status=status.HTTP_200_OK)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@login_required
@parser_classes([MultiPartParser, FormParser])
def upload_avatar(request):
    profile = Profile.objects.get(user=request.user)
    file = request.FILES.get('avatar')
    if file:
        profile.avatar.save(file.name, file, save=True)
        return Response({'message': 'Avatar updated successfully'}, status=status.HTTP_200_OK)
    return Response({'error': 'No avatar provided'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@login_required
def add_friend_view(request):
    friend_username = request.data.get('friend_username')
    try:
        friend = User.objects.get(username=friend_username)
        profile = request.user.profile
        if friend.profile not in profile.friends.all():
            profile.friends.add(friend.profile)
            return Response({"message": "Friend added successfully"}, status=status.HTTP_201_CREATED)
        else:
            return Response({"error": "Already friends"}, status=status.HTTP_409_CONFLICT)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

