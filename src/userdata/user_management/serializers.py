from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile
from django.db import models

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    friends = UserSerializer(many=True, read_only=True)
    stats = serializers.JSONField(read_only=True)

    class Meta:
        model = Profile
        fields = ['user', 'display_name', 'avatar', 'friends', 'stats']

    def update(self, instance, validated_data):
        instance.display_name = validated_data.get('display_name', instance.display_name)
        avatar = validated_data.get('avatar')
        if avatar:
            instance.avatar.save(avatar.name, avatar)
        instance.save()
        return instance
