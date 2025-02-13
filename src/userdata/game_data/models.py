from django.db import models
from user_management.models import Profile
from django.utils.timezone import now
import logging

class GameData(models.Model):
	GAME_MODES = [
		('two-player-pong', 'Pong'),
		('pac-pong', 'PacPong'),
  		('four-player-tournament', 'Tournament')
	]
	gameMode = models.CharField(max_length=30, choices=GAME_MODES)
	lobbyName = models.CharField(max_length=100, default="unknown")
	players = models.ManyToManyField(Profile, related_name="games")
	gameFinished = models.BooleanField(default=True)
	score = models.JSONField(default=list) #TODO: Change to List of {"player_id": int, "score": int}
	dateTime = models.DateTimeField(default=now)

	class Meta:
		ordering = ['-dateTime']
	
	def __str__(self):
		player_names = [player.user.username for player in self.players.all()]
		score_strings = [str(points)  for points in self.score]
		return (str(self.dateTime) + ':' + 'gameMode' + str(self.gameMode) + ', players:' + ", ".join(player_names) + 
				'\tscore: ' + "-".join(score_strings))
