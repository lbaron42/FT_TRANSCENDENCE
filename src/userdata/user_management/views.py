import logging
from django.utils.timezone import now
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.utils.crypto import get_random_string
from django.shortcuts import render, redirect
from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.http import HttpResponse, Http404
from django.db.models import Q
from .models import Profile, FriendRequest, TwoFactorCode
from .serializers import UserSerializer, ProfileSerializer, FriendSerializer, FriendRequestSerializer, TokenWith2FASerializer
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework import viewsets
from django.shortcuts import get_object_or_404, redirect
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from django.utils.timezone import now
from django.core.mail import send_mail
from django.core.cache import cache
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.permissions import AllowAny
from django.conf import settings


logger = logging.getLogger('django')

def create_tokens(user, two_fa_status=False):
	"""
	Generate JWT tokens with a 2FA status claim.
	"""
	refresh = RefreshToken.for_user(user)
	refresh['2fa_status'] = two_fa_status
	return {
		'refresh': str(refresh),
		'access': str(refresh.access_token),
	}

def generate_otp(user):

	otp, _ = TwoFactorCode.objects.get_or_create(user=user)
	otp.code = get_random_string(length=6, allowed_chars='0123456789')
	otp.timestamp = now()
	otp.save()
	logger.info(f"Generated OTP for {user.username}: {otp.code}")
	send_email_code(user, otp.code)

def send_email_code(user, otp_code):

	subject = "Your OTP Code"
	message = f"Hello {user.username},\n\nYour OTP code is {otp_code}. It is valid for 5 minutes."
	sender_email = settings.EMAIL_HOST_USER
	send_mail(subject, message, "no-reply@example.com", [user.email])


@api_view(['POST'])
@permission_classes([AllowAny])
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
@permission_classes([AllowAny])
def login_view(request):
	username = request.data.get('username')
	password = request.data.get('password')
	user = authenticate(request, username=username, password=password)

	if user:
		if user.profile.twoFA_active:
			generate_otp(user)
			return Response({
				"message": "2FA required. OTP sent to your email.",
				"two_fa_required": True,
				"username": user.username
			}, status=status.HTTP_200_OK)

		user.profile.online_status = True
		user.profile.save(update_fields=["online_status"])
		tokens = create_tokens(user, two_fa_status=True)
		login(request, user)
		return Response({
			"message": "Login successful.",
			"tokens": tokens
		}, status=status.HTTP_200_OK)

	return Response({"error": "Invalid username or password"}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_2fa(request):
	otp_code = request.data.get('otp')
	username = request.data.get('username')

	if not otp_code or not username:
		print(f"DEBUG: Missing OTP or Username -> OTP: {otp_code}, Username: {username}")
		return Response({"error": "OTP code and username are required."}, status=status.HTTP_400_BAD_REQUEST)

	user = User.objects.filter(username=username).first()
	if not user:
		print(f"DEBUG: No user found for username: {username}")
		return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

	otp_record = TwoFactorCode.objects.filter(user=user, code=otp_code).first()
	if not otp_record:
		print(f"DEBUG: Invalid OTP entered for user {username}: {otp_code}")
		return Response({"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

	if not otp_record.is_valid():
		print(f"DEBUG: Expired OTP for user {username}: {otp_code}")
		return Response({"error": "Expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

	otp_record.delete()
	tokens = create_tokens(user, two_fa_status=True)

	print(f"DEBUG: 2FA Verification Successful for {username}")
	return Response({
		"message": "2FA verification successful.",
		"tokens": tokens
	}, status=status.HTTP_200_OK)


@api_view(['POST'])
@login_required
def logout_view(request):
	try:
		refresh_token = request.data.get('refresh')
		if refresh_token:
			try:
				token = RefreshToken(refresh_token)
				token.blacklist()
			except Exception as e:
				logger.warning(f"Failed to blacklist token: {e}")

		request.user.profile.online_status = False
		request.user.profile.save(update_fields=["online_status"])

		logout(request)
		return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)

	except Exception as e:
		logger.error(f"Logout error: {e}")
		return Response({"error": "Logout failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
	refresh_token = request.data.get("refresh")
	if not refresh_token:
		return Response({"error": "Refresh token required"}, status=status.HTTP_400_BAD_REQUEST)

	try:
		refresh = RefreshToken(refresh_token)
		access_token = str(refresh.access_token)
		return Response({"access": access_token}, status=status.HTTP_200_OK)
	except TokenError:
		return Response({"error": "Invalid or expired refresh token"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
	user = request.user

	try:
		profile = get_object_or_404(Profile.objects.select_related('user'), user=user)
		serializer = ProfileSerializer(profile)
		data = serializer.data
		data['csrf_token'] = get_token(request)

		data['username'] = user.username
		data['display_name'] = profile.display_name if hasattr(profile, 'display_name') else user.username

		data['online_status'] = profile.online_status
		return Response(data, status=status.HTTP_200_OK)
	except Profile.DoesNotExist:
		return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def update_profile_view(request):
	profile = get_object_or_404(Profile, user=request.user)
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
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_avatar(request):
	if not request.user.is_authenticated:
		return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

	profile = get_object_or_404(Profile, user=request.user)
	file = request.FILES.get('avatar')

	if not file:
		return Response({'error': 'No avatar provided'}, status=status.HTTP_400_BAD_REQUEST)

	if profile.avatar:
		try:
			profile.avatar.delete(save=False)
		except Exception as e:
			return Response({'error': f'Error deleting old avatar: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

	profile.avatar.save(request.user.username + '_' + str(now()), file, save=True)
	return Response({'message': 'Avatar updated successfully'}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_avatar(request):
	profile = get_object_or_404(Profile, user=request.user)

	avatar_path = profile.avatar.path
	try:
		with open(avatar_path, 'rb') as avatar_file:
			return HttpResponse(avatar_file.read(), content_type="image/jpeg")
	except FileNotFoundError:
		return redirect('/images/default_avatar.jpg')
	except Exception as e:
		raise Http404(f"An error occurred: {str(e)}")

@api_view(['POST'])
@login_required
def toggle_2fa(request):
	enable = request.data.get('enable', False)
	profile = request.user.profile

	if enable:
		profile.twoFA_active = True
		profile.save()
		return Response({"message": "2FA enabled."}, status=status.HTTP_200_OK)

	else:
		profile.twoFA_active = False
		TwoFactorCode.objects.filter(user=request.user).delete()
		profile.save()
		return Response({"message": "2FA disabled."}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp(request):
	username = request.data.get("username")

	if not username:
		return Response({"error": "Username is required to resend OTP."}, status=status.HTTP_400_BAD_REQUEST)

	user = User.objects.filter(username=username).first()
	if not user:
		return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

	otp_record = TwoFactorCode.objects.filter(user=user).first()

	try:
		generate_otp(user)
		return Response({"message": "New OTP sent to your email."}, status=status.HTTP_200_OK)
	except Exception as e:
		return Response({"error": f"Failed to resend OTP: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FriendActionsViewSet(viewsets.ViewSet):
	"""Manage friend operations (list, add, remove)."""
	permission_classes = [IsAuthenticated]

	@action(detail=False, methods=['get'], url_path='list')
	def fetch_friends(self, request):
		try:
			profile = get_object_or_404(Profile.objects.prefetch_related('friends'), user=request.user)
			friends = profile.friends.filter(user__profile__isnull=False)

			serialized_friends = FriendSerializer(friends, many=True, context={'request': request})
			return Response(serialized_friends.data, status=status.HTTP_200_OK)
		except Exception as e:
			logger.error(f"Error fetching friends: {e}")  # 🔍 Log the error
			return Response({'error': 'Failed to load friends.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


	@action(detail=False, methods=['post'], url_path='add/(?P<username>[^/.]+)')
	def send_friend_invite(self, request, username=None):
		"""Send a friend request instead of directly adding a friend."""
		if username == request.user.username:
			return Response({'status': 'error', 'message': 'Cannot add yourself.'}, status=status.HTTP_400_BAD_REQUEST)

		friend_user = get_object_or_404(User, username=username)
		if not hasattr(friend_user, 'profile'):
			return Response({'status': 'error', 'message': 'User does not have a profile.'}, status=status.HTTP_400_BAD_REQUEST)

		profile = get_object_or_404(Profile, user=request.user)

		if friend_user.profile in profile.friends.all():
			return Response({'status': 'error', 'message': 'Already friends.'}, status=status.HTTP_400_BAD_REQUEST)

		if FriendRequest.objects.filter(
			Q(from_user=request.user, to_user=friend_user) | Q(from_user=friend_user, to_user=request.user)
		).exists():
			return Response({'status': 'error', 'message': 'Friend request already exists.'}, status=status.HTTP_400_BAD_REQUEST)

		FriendRequest.objects.create(from_user=request.user, to_user=friend_user)

		return Response({'status': 'success', 'message': 'Friend request sent.'}, status=status.HTTP_201_CREATED)


	@action(detail=False, methods=['delete'], url_path='remove/(?P<username>[^/.]+)')
	def remove_friendship(self, request, username=None):
		"""Remove a friend."""
		friend_user = get_object_or_404(User, username=username)
		profile = get_object_or_404(Profile, user=request.user)

		if friend_user.profile not in profile.friends.all():
			return Response({'status': 'error', 'message': 'Not in friend list.'}, status=status.HTTP_400_BAD_REQUEST)

		profile.friends.remove(friend_user.profile)
		return Response({'status': 'success', 'message': f'{username} removed.'}, status=status.HTTP_200_OK)
	@action(detail=False, methods=['post'], url_path='block/(?P<username>[^/.]+)')

	def block_user(self, request, username=None):
		if username == request.user.username:
			return Response({'status': 'error', 'message': 'You cannot block yourself.'}, status=status.HTTP_400_BAD_REQUEST)

		blocked_user = get_object_or_404(User, username=username)
		profile = get_object_or_404(Profile, user=request.user)

		if blocked_user.profile in profile.friends.all():
			profile.friends.remove(blocked_user.profile)

		profile.blocked_users.add(blocked_user.profile)

		return Response({'status': 'success', 'message': f'{username} has been blocked.'}, status=status.HTTP_200_OK)

class FriendRequestViewSet(viewsets.ViewSet):
	"""ViewSet for managing friend requests (send, accept, decline)."""
	permission_classes = [IsAuthenticated]

	@action(detail=False, methods=['get'], url_path='pending')
	def get_pending_requests(self, request):
		"""Retrieve pending friend requests."""
		pending_requests = FriendRequest.objects.filter(
			to_user=request.user, is_accepted=False, is_rejected=False
		).select_related('from_user')

		serialized_requests = FriendRequestSerializer(pending_requests, many=True)
		return Response({'status': 'success', 'pending_requests': serialized_requests.data})

	@action(detail=False, methods=['post'], url_path='request/(?P<username>[^/.]+)')
	def send_request(self, request, username=None):
		"""Send a friend request."""
		if username == request.user.username:
			return Response(
				{'status': 'error', 'message': 'You cannot send a request to yourself.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		recipient = get_object_or_404(User, username=username)

		if FriendRequest.objects.filter(
			Q(from_user=request.user, to_user=recipient) | Q(from_user=recipient, to_user=request.user)
		).exists():

			return Response(
				{'status': 'error', 'message': 'Friend request already exists.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if recipient.profile in request.user.profile.friends.all():
			return Response(
				{'status': 'error', 'message': 'You are already friends with this user.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		friend_request = FriendRequest.objects.create(from_user=request.user, to_user=recipient)
		return Response(
			{'status': 'success', 'request_id': friend_request.id},
			status=status.HTTP_201_CREATED
		)

	@action(detail=False, methods=['post'], url_path='accept/(?P<request_id>\d+)')
	def accept_request(self, request, request_id=None):
		"""Accept a friend request."""
		friend_request = get_object_or_404(FriendRequest, id=request_id, to_user=request.user)

		sender_profile = friend_request.from_user.profile
		receiver_profile = request.user.profile

		sender_profile.friends.add(receiver_profile)
		receiver_profile.friends.add(sender_profile)

		friend_request.delete()

		return Response(
			{'status': 'success', 'message': 'Friend request accepted.'},
			status=status.HTTP_200_OK
		)

	@action(detail=False, methods=['post'], url_path='decline/(?P<request_id>\d+)')
	def decline_request(self, request, request_id=None):
		"""Decline a friend request."""
		friend_request = get_object_or_404(FriendRequest, id=request_id, to_user=request.user)

		friend_request.delete()

		return Response(
			{'status': 'success', 'message': 'Friend request declined.'},
			status=status.HTTP_200_OK
		)
