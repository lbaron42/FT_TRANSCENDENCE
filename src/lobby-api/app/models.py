from django.db import models
from django.contrib.auth.hashers import make_password, check_password

class Lobby(models.Model):
    name = models.CharField(
        max_length=100, 
        unique=True, 
        help_text="Unique name for the lobby. Acts as an identifier."
    )
    tournament_mode = models.BooleanField(
        default=False
    )
    pac_pong = models.BooleanField(
        default=False
    )
    current_player_count = models.PositiveIntegerField(
        default=0, 
        help_text="The number of players currently in the lobby. Maximum is 2."
    )
    max_player_count = models.PositiveIntegerField(
        default=2, 
        help_text="The number of players currently in the lobby. Maximum is 2."
    )
    in_lobby = models.JSONField(
        default=list, 
        help_text="List of player names currently in the lobby (max 3)."
    )
    max_score = models.PositiveIntegerField(
        default=3, 
        help_text="The max score of a game session."
    )
    p1 = models.CharField(
        default=None,
        max_length=100, 
        blank=True, 
        null=True,
        help_text="The first player in the lobby."
    )
    p2 = models.CharField(
        default=None,
        max_length=100, 
        blank=True, 
        null=True,
        help_text="The first player in the lobby."
    )
    p3 = models.CharField(
        default=None,
        max_length=100, 
        blank=True, 
        null=True,
        help_text="The third player in the lobby."
    )

    def __str__(self):
        return self.name
    