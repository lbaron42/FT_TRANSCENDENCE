import logging
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile
from .models import FriendRequest
from django.db import models
from datetime import timedelta
from django.utils.timezone import now
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.settings import api_settings

logger = logging.getLogger('django')

class UserSerializer(serializers.ModelSerializer):
    twoFA_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email',  'twoFA_active']

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    stats = serializers.JSONField(read_only=True)
    avatar_url = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True)
    online_status = serializers.BooleanField(read_only=True)

    class Meta:
        model = Profile
        fields = ['user', 'display_name', 'avatar_url', 'stats', 'password', 'online_status']

    def get_avatar_url(self, obj):
        if obj.avatar:
            return obj.avatar.url
        return f"./avatars/default-avatar.jpeg"


    def update(self, instance, validated_data):
        instance.display_name = validated_data.get('display_name', instance.display_name)

        avatar = validated_data.get('avatar')
        if avatar:
            instance.avatar.save(avatar.name, avatar)

        password = validated_data.pop('password', None)
        if password:
            instance.user.set_password(password)
            instance.user.save()
        instance.save()
        return instance

class FriendSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    is_friend = serializers.SerializerMethodField()
    online_status = serializers.BooleanField()

    class Meta:
        model = Profile
        fields = ['id', 'username', 'is_friend', 'online_status']

    def get_username(self, obj):
        if isinstance(obj, User):
            return obj.username
        return obj.user.username

    def get_is_friend(self, obj):
        request = self.context.get('request', None)
        if request and request.user.is_authenticated:
            return obj in request.user.profile.friends.all()
        return False


class FriendRequestSerializer(serializers.ModelSerializer):
    from_user = serializers.CharField(source='from_user.username')
    to_user = serializers.CharField(source='to_user.username')

    class Meta:
        model = FriendRequest
        fields = ['id', 'from_user', 'to_user', 'created_at', 'is_accepted', 'is_rejected']

class TokenWith2FASerializer(TokenObtainPairSerializer):

    def validate(self, attrs):
        jwt_data = super().validate(attrs)
        token_instance = self.get_token(self.user)

        if self.user.profile.is_2fa_enabled:
            token_instance['2fa_verified'] = False
        else:
            token_instance['2fa_verified'] = True

        jwt_data['refresh'] = str(token_instance)
        jwt_data['access'] = str(token_instance.access_token)

        if api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, self.user)

        return jwt_data
