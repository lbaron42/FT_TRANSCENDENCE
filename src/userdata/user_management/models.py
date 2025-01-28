from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.crypto import get_random_string

def defaultStats():
	initStats = dict()
	initStats["games-wins"] = 0
	initStats["games-losses"] = 0
	initStats["games-draws"] = 0
	initStats["games-played"] = 0
	initStats["ranking-score"] = 0
	return initStats

class Profile(models.Model):
	user = models.OneToOneField(User, on_delete=models.CASCADE)
	display_name = models.CharField(max_length=50, unique=True)
	avatar = models.ImageField(upload_to="avatars/", default="avatars/default.png")
    friends = models.ManyToManyField("self", blank=True, symmetrical=True, related_name="friends_with")
	stats = models.JSONField(default=defaultStats)

	def __str__(self):
		return self.user.username
