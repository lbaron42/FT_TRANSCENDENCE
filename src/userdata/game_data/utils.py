# Calculations based on the work of Elo as described in https://en.wikipedia.org/wiki/Elo_rating_system
def updateEloScore(playerRanking, opponentRanking, gameResult):
	expectedResult = 1 / (1 + 10**((opponentRanking - playerRanking)/400))
	newRating = max(0, playerRanking + 10 * (gameResult - expectedResult))
	return int(newRating)