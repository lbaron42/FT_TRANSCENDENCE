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
from .models import Profile, FriendRequest, TwoFactorCode
from .serializers import UserSerializer, ProfileSerializer, FriendSerializer, FriendRequestSerializer, TokenWith2FASerializer
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework import viewsets
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from django.utils.timezone import now
from django.core.mail import send_mail
from django.core.cache import cache
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.permissions import AllowAny

logger = logging.getLogger('django')

### Utility Functions ###

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
    """
    Generates a One-Time Password (OTP) for 2FA.
    """
    otp, _ = TwoFactorCode.objects.get_or_create(user=user)
    otp.code = get_random_string(length=6, allowed_chars='0123456789')
    otp.timestamp = now()
    otp.save()
    logger.info(f"Generated OTP for {user.username}: {otp.code}")
    send_email_code(user, otp.code)

def send_email_code(user, otp_code):
    """
    Sends an email with the OTP code.
    """
    subject = "Your OTP Code"
    message = f"Hello {user.username},\n\nYour OTP code is {otp_code}. It is valid for 5 minutes."
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

        # If 2FA is not required, issue JWT tokens
        tokens = create_tokens(user, two_fa_status=True)
        login(request, user)
        return Response({
            "message": "Login successful.",
            "tokens": tokens
        }, status=status.HTTP_200_OK)

    return Response({"error": "Invalid username or password"}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@login_required
def verify_2fa(request):
    otp_code = request.data.get('otp')
    attempts_key = f"otp_attempts_{request.user.id}"

    if not otp_code:
        return Response({"error": "OTP code is required."}, status=status.HTTP_400_BAD_REQUEST)

    otp_record = TwoFactorCode.objects.filter(user=request.user, code=otp_code).first()

    if not otp_record:
        cache.incr(attempts_key)
        cache.expire(attempts_key, 300)
        return Response({"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

    if otp_record.is_valid():
        otp_record.delete()
        cache.delete(attempts_key)

        tokens = create_tokens(request.user, two_fa_status=True)

        return Response({
            "message": "2FA verification successful.",
            "tokens": tokens
        }, status=status.HTTP_200_OK)

    return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def logout_view(request):
    tokens = RefreshToken(request.data.get('refresh'))
    tokens.blacklist()
    logout(request)
    return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """
    Refreshes the access token using the refresh token.
    """
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
    if not request.user.is_authenticated:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        profile = get_object_or_404(Profile.objects.select_related('user'), user=request.user)
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
@login_required
@parser_classes([MultiPartParser, FormParser])
def upload_avatar(request):
    profile = get_object_or_404(Profile, user=request.user)
    file = request.FILES.get('avatar')
    if file:
        profile.avatar.save(file.name, file, save=True)
        return Response({'message': 'Avatar updated successfully'}, status=status.HTTP_200_OK)
    return Response({'error': 'No avatar provided'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@login_required
def toggle_2fa(request):
    enable = request.data.get('enable', False)
    profile = request.user.profile

    if enable:
        generate_otp(request.user)
        profile.twoFA_active = True
        profile.save()
        return Response({"message": "2FA enabled. OTP sent to your email."}, status=status.HTTP_200_OK)

    else:
        profile.twoFA_active = False
        TwoFactorCode.objects.filter(user=request.user).delete()  # Clear any active OTPs
        profile.save()
        return Response({"message": "2FA disabled."}, status=status.HTTP_200_OK)

@api_view(['POST'])
@login_required
def resend_otp(request):
    user = request.user
    otp_record = TwoFactorCode.objects.filter(user=user).first()

    if otp_record and (now() - otp_record.timestamp).seconds < 30:
        return Response({"error": "Please wait before requesting another OTP."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

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
            serialized_friends = FriendSerializer(profile.friends.all(), many=True, context={'request': request})
            return Response(serialized_friends.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error fetching friends: {e}")  # 🔍 Log the error
            return Response({'error': 'Failed to load friends.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    @action(detail=False, methods=['post'], url_path='add/(?P<username>[^/.]+)')
    def send_friend_invite(self, request, username=None):
        """Add a friend directly."""
        if username == request.user.username:
            return Response({'status': 'error', 'message': 'Cannot add yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        friend_user = get_object_or_404(User, username=username)
        profile = get_object_or_404(Profile, user=request.user)

        if friend_user.profile in profile.friends.all():
            return Response({'status': 'error', 'message': 'Already friends.'}, status=status.HTTP_400_BAD_REQUEST)

        profile.friends.add(friend_user.profile)
        return Response({'status': 'success', 'friend': FriendSerializer(friend_user.profile).data}, status=status.HTTP_201_CREATED)


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
            models.Q(from_user=request.user, to_user=recipient) |
            models.Q(from_user=recipient, to_user=request.user)
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
