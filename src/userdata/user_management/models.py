from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.crypto import get_random_string
from django.utils.timezone import now
from django.utils import timezone

def defaultStats():
    initStats = dict()
    for mode in ['total','two-player-pong','pac-pong','four-player-tournament']:
        initStats[mode] = {
            "games-wins": 0,
            "games-losses": 0,
            "games-draws": 0,
            "games-played": 0
        }
    initStats['two-player-pong']['ranking-score'] = 1000
    return initStats

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    display_name = models.CharField(max_length=50, unique=True)
    avatar = models.ImageField(upload_to="avatars/", default="avatars/default.png")
    friends = models.ManyToManyField("self", blank=True, symmetrical=True)
    stats = models.JSONField(default=defaultStats)
    twoFA_active = models.BooleanField(default=False)
    online_status = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username

class FriendRequest(models.Model):
    from_user = models.ForeignKey(User, related_name="sent_requests", on_delete=models.CASCADE)
    to_user = models.ForeignKey(User, related_name="received_requests", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_accepted = models.BooleanField(default=False)
    is_rejected = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.from_user} → {self.to_user}"

class TwoFactorCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        return (timezone.now() - self.timestamp).seconds < 300
