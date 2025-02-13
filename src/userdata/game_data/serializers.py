from rest_framework import serializers
import logging
from .models import GameData
from .utils import updateEloScore
from user_management.models import Profile
from django.contrib.auth.models import User

logger = logging.getLogger('django')

class GameDataSerializer(serializers.ModelSerializer):
	players = serializers.ListField(
		child=serializers.CharField(),
		write_only=True
	)
	dateTime = serializers.DateTimeField(read_only=True)

	class Meta:
		model = GameData
		fields = ['id', 'gameMode', 'players', 'score', 'dateTime','lobbyName']

	def validate_gameMode(self, value):
		if value not in dict(GameData.GAME_MODES):
			raise serializers.ValidationError("Invalid gameMode. Valid options are: " +
												', '.join(dict(GameData.GAME_MODES).keys()))
		return value
	
	def validate_score(self, value):
		if not isinstance(value, list):
			raise serializers.ValidationError({"score": "There is no list of points given"})
		if not all(isinstance(score, int) and score >= 0 for score in value):
			raise serializers.ValidationError("All scores must be non-negative integers.")
		return value
	
	def validate_players(self, value):
		profiles = []
		if not value:
			raise serializers.ValidationError({"players": "There must at least exist one player"})
		for player_name in value:
			try:
				user = User.objects.get(username=player_name)
				profile = Profile.objects.get(user=user)
				profiles.append(profile)
			except User.DoesNotExist:
				raise serializers.ValidationError(f"User with username '{player_name}' does not exist.")
			except Profile.DoesNotExist:
				raise serializers.ValidationError(f"Profile for user '{player_name}' does not exist.")
		return profiles

	def validate(self, data):
		players = data.get("players",[])
		gameMode = data.get("gameMode")
		# number of players validation
		if not players:
			raise serializers.ValidationError({"players": "There must at least exist one player"})
		if ((gameMode == 'two-player-pong' and len(players) != 2) or
  			(gameMode == 'pac-pong' and len(players) != 3) or
     		(gameMode == 'four-player-tournament' and len(players) != 4)):
			raise serializers.ValidationError({"gameMode": f"Not the right amount of players for gamemode \'{gameMode}\'"})
		return data
	
	def create(self, validated_data):
		profiles = validated_data.pop('players')
		game = GameData.objects.create(**validated_data)
		game.players.set(profiles)
		gameMode = validated_data.get('gameMode')
		if gameMode not in ['two-player-pong','pac-pong','four-player-tournament']:
			raise serializers.ValidationError({"gameMode": f"Statistics for \'{gameMode}\' are not implemented yet"})
		score = validated_data['score']
		for profile_idx, profile in enumerate(profiles):
			profile.stats[gameMode]['games-played'] += 1
			profile.stats['total']['games-played'] += 1
			gameResult = 0
			if len(set(score)) == 1:
				profile.stats[gameMode]['games-draws'] += 1
				profile.stats['total']['games-draws'] += 1
				gameResult = 0.5
			elif score[profile_idx] == max(score):
				profile.stats[gameMode]['games-wins'] += 1
				profile.stats['total']['games-wins'] += 1
				gameResult = 1
			else:
				profile.stats[gameMode]['games-losses'] += 1
				profile.stats['total']['games-losses'] += 1
			if gameMode == 'two-player-pong':
				opponent_idx = (profile_idx + 1) % 2
				profile.stats[gameMode]['ranking-score'] = updateEloScore(profile.stats[gameMode]['ranking-score'],
												profiles[opponent_idx].stats[gameMode]['ranking-score'], gameResult)
			profile.save()
		logger.info("Created a game data object")
		return game
	
	def to_representation(self, instance):
		representation = super().to_representation(instance)
		representation['players'] = [profile.user.username for profile in instance.players.all()]
		return representation

